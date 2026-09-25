/* t-bunny — v455 新夥伴「小跳」（Alan 給了一張白兔子參考圖，價格 300，
 * 招牌動作＝吃紅蘿蔔＋跳到螢幕一半高） */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const data = fs.readFileSync(new URL('data.js', ROOT), 'utf8');
const fx   = fs.readFileSync(new URL('components-fx.jsx', ROOT), 'utf8');
const css  = fs.readFileSync(new URL('styles-fx.css', ROOT), 'utf8');
const slice = (src, a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i); if (i < 0 || j < 0) throw new Error('找不到 ' + a); return src.slice(i, j); };
const W = new Function('_db', 'window', slice(data, 'const MX_KINDS = [', 'Object.assign(window, { mxPurchases') +
  '\nreturn { MX_SHOP, MX_BY_ID, mxOwnedPets, mxSpent, mxPetItem };')(
  { collection: () => ({ doc: () => ({ set: async () => {} }) }) }, {});

let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  ✅ ' + n); } else { fail++; console.log('  ❌ ' + n); } };
const eq = (n, a, b) => ok(n + (a === b ? '' : ` — 得到 ${JSON.stringify(a)}，應該是 ${JSON.stringify(b)}`), a === b);
const flat = css.replace(/\n/g, ' ');

console.log('\n【1】商店裡買得到（300 顆星星）');
const bun = W.MX_BY_ID.pet_bun;
ok('小跳在商品表裡', !!bun);
eq('價格 300', bun.cost, 300);
eq('是「夥伴」這一類', bun.kind, 'pet');
eq('對得到 components-fx.jsx 的 pet id', bun.pet, 'bun');
ok('不是免費的（要用星星請）', !bun.free);
ok('有中文名字與圖示', bun.zh === '小跳' && bun.emoji === '🐰');
eq('買了就多一隻可以選', W.mxOwnedPets({ owned: ['pet_bun'] }).sort().join(), 'bun,clay');
eq('花掉的星星算得對', W.mxSpent({ owned: ['pet_bun'] }), 300);
ok('沒買就選不到牠', W.mxOwnedPets({}).indexOf('bun') < 0);

console.log('\n【2】畫得出來、而且是網站原本的像素風');
ok('有 BunnyMascot', /function BunnyMascot\(/.test(fx));
const art = slice(fx, 'function BunnyMascot(', '\n}\n');
ok('⭐ 同一個 18×20 網格（跟其他五隻一樣）', /viewBox="0 -4 18 20"/.test(art));
ok('⭐ 一樣用 crispEdges（像素風不要抗鋸齒）', /shapeRendering="crispEdges"/.test(art));
ok('有 .mx-torso（走路／呼吸那些現成動畫掛在它身上）', /className="mx-torso"/.test(art));
ok('有兩顆 .mx-eye（眨眼動畫要用）', (art.match(/className="mx-eye"/g) || []).length === 2);
ok('有三隻腳 a/b/c（走路動畫要用）', ['mx-leg-a', 'mx-leg-b', 'mx-leg-c'].every(k => art.indexOf(k) > 0));
ok('⭐ 腳踩在地板上（y=12 高 4 → 底部 16，跟其他夥伴一樣）', (art.match(/y="12" width="\d" height="4"/g) || []).length === 3);
ok('帽子與配件都接上了（跟其他夥伴同一套）',
  /<MxHat id=\{hat\} fit=\{MX_FIT\.bun\}\/>/.test(art) &&
  /layer="back"/.test(art) && /layer="front"/.test(art));
ok('參考圖的重點都有：長耳朵、粉內耳、淺藍蝴蝶結、腮紅',
  /mx-ear-l/.test(art) && /mx-ear-r/.test(art) && /INNER/.test(art) && /BOW/.test(art) && /BLUSH/.test(art));
ok('⭐ MX_FIT.bun 把帽子壓低縮小（不然會蓋住兩隻耳朵）', /bun:\s*\{ hat: \{ x: 9,\s*y: 1\.2,\s*s: 0\.82 \}/.test(fx));

console.log('\n【3】名冊裡的設定');
ok('MX_PETS 有小跳', /id: 'bun', speed: 1\.1, zh: '小跳'/.test(fx));
ok('招牌動作叫 hop', /sig: 'hop'/.test(fx));
ok('招牌動作的中文寫清楚了', /sigZh: '吃紅蘿蔔＋跳超高'/.test(fx));
ok('⭐ 免費動作只有走路＋自己的招牌（v451 的規矩）', /acts: \['walk', 'walk', 'walk', 'hop'\]/.test(fx));
ok('招牌動作有停留時間（不然一閃而過）', /hop: 3600/.test(fx));
ok('有自己的台詞（含吃紅蘿蔔那幾句）', /卡滋卡滋…好吃 🥕/.test(fx));

console.log('\n【4】吃紅蘿蔔＋跳到螢幕一半');
ok('紅蘿蔔平常看不到', /\.mx-carrot \{ opacity: 0; \}/.test(flat));
ok('只有招牌動作才拿出來啃', /\.pet-bun\.act-hop \.mx-carrot \{ animation: mxCarrot/.test(flat));
ok('⭐ 啃三口愈來愈短（從尖端那一頭啃，所以縮的是 scaleX）',
  flat.indexOf('scaleX(.78)') > 0 && flat.indexOf('scaleX(.52)') > flat.indexOf('scaleX(.78)') &&
  flat.indexOf('scaleX(.26)') > flat.indexOf('scaleX(.52)'));
ok('縮放原點在右邊（尖端在左邊，從左邊啃）', /\.pet-bun\.act-hop \.mx-carrot \{ transform-origin: 88% 50%; \}/.test(flat));
ok('紅蘿蔔橫著拿到嘴邊（不是插在胸前）', /<rect x="9\.4" y="7\.4" width="4\.6" height="2"/.test(fx));
ok('⭐ 跳到 -46vh ＝ 畫面一半（用 vh 才會每個裝置都是「半個螢幕」）', /translateY\(-46vh\)/.test(flat));
ok('起跳前有蹲下蓄力', /translateY\(1\.5px\) scaleY\(\.76\)/.test(flat));
ok('落地會壓扁、再彈一小下', /scaleY\(\.74\)\s*scaleX\(1\.2\)/.test(flat) && /translateY\(-7vh\)/.test(flat));
ok('⭐ 最後回到地面（不會停在半空中）', /100%\s*\{ transform: translateY\(0\)\s*scaleY\(1\)\s*scaleX\(1\); \}/.test(flat));
ok('耳朵會跟著往後飄', /@keyframes mxEarFlop/.test(flat) && /\.pet-bun\.act-hop \.mx-ear/.test(flat));
ok('⭐ 泡泡跟著一起飛（不然話會留在地板上）', /mx-bubble-hop/.test(flat) && /mx-bubble-hop/.test(fx));
ok('⚠ 跳起來不能被 SVG 邊界切掉', /\.pet-bun\.act-hop \.mx-svg \{[^}]*overflow: visible/.test(flat));
ok('關掉動畫的人不會看到牠亂跳',
  /prefers-reduced-motion[\s\S]{0,260}\.pet-bun\.act-hop \.mx-svg, \.pet-bun\.act-hop \.mx-carrot/.test(css));

console.log(fail ? `\n❌ ${fail} failed, ${pass} passed` : `\n🎉 全部通過：${pass} passed, 0 failed`);
process.exit(fail ? 1 : 0);
