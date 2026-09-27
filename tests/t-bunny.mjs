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
ok('⭐ v457：平常只有走路（招牌留給「點一下」，v451 的規矩照舊）', /acts: \['walk'\],/.test(fx));
ok('招牌動作有停留時間（不然一閃而過）', /hop: 3600/.test(fx));
ok('有自己的台詞（含吃紅蘿蔔那幾句）', /卡滋卡滋…好吃 🥕/.test(fx));

console.log('\n【4】吃紅蘿蔔＋跳到螢幕一半');
ok('紅蘿蔔平常看不到', /\.mx-carrot \{ opacity: 0; \}/.test(flat));
ok('只有招牌動作才拿出來啃', /\.pet-bun\.act-hop \.mx-carrot \{ animation: mxCarrot/.test(flat));
ok('⭐ 啃三口愈來愈短（從尖端那一頭啃，所以縮的是 scaleX）',
  flat.indexOf('scaleX(.72)') > 0 && flat.indexOf('scaleX(.44)') > flat.indexOf('scaleX(.72)') &&
  flat.indexOf('scaleX(.2)') > flat.indexOf('scaleX(.44)'));
ok('縮放原點在右邊（尖端在左邊，從左邊啃）', /\.pet-bun\.act-hop \.mx-carrot \{ transform-origin: 92% 50%; \}/.test(flat));
ok('紅蘿蔔橫著拿到嘴邊（不是插在胸前）', /<rect x="7\.6" y="7\.2" width="6\.6" height="3\.2"/.test(fx));
ok('⭐ 有一條可愛的毛球尾巴', /className="mx-tail"/.test(fx) && /rx="2\.2"/.test(fx));
ok('⭐ 跳的高度用變數（vh 在矮視窗／iPad 網址列伸縮時會算得很小，甚至 0）',
  /--mx-jump: clamp\(150px, 44vh, 520px\)/.test(flat));
ok('⭐ 變數萬一沒定義也有退路（不然那一格會失效＝整個跳不起來）',
  /var\(--mx-jump, 44vh\)/.test(flat) && flat.indexOf('var(--mx-jump)') < 0);
ok('最高點＝一整個 --mx-jump', /translateY\(calc\(var\(--mx-jump, 44vh\) \* -1\)\)/.test(flat));
ok('起跳前有蹲下蓄力', /translateY\(1\.5px\) scaleY\(\.76\)/.test(flat));
ok('落地會壓扁、再彈一小下', /scaleY\(\.74\)\s*scaleX\(1\.2\)/.test(flat) && /\* -\.14\)/.test(flat));
ok('⭐ 最後回到地面（不會停在半空中）', /100%\s*\{ transform: translateY\(0\)\s*scaleY\(1\)\s*scaleX\(1\); \}/.test(flat));
ok('耳朵會跟著往後飄', /@keyframes mxEarFlop/.test(flat) && /\.pet-bun\.act-hop \.mx-ear/.test(flat));
ok('⭐ 泡泡跟著一起飛（不然話會留在地板上）', /mx-bubble-hop/.test(flat) && /mx-bubble-hop/.test(fx));
ok('⚠ 跳起來不能被 SVG 邊界切掉', /\.pet-bun\.act-hop \.mx-svg \{[^}]*overflow: visible/.test(flat));
ok('關掉動畫的人不會看到牠亂跳',
  /prefers-reduced-motion[\s\S]{0,260}\.pet-bun\.act-hop \.mx-svg, \.pet-bun\.act-hop \.mx-carrot/.test(css));

console.log('\n【5】v456：走路要用兔子的方式（不是像螃蟹一樣挪）');
ok('⭐ 走路換成一跳一跳（只蓋 .pet-bun，其他五隻不動）',
  /\.pet-bun\.act-walk \.mx-svg\s+\{ animation: mxBunHop/.test(flat));
ok('其他夥伴的走路還是原本那一套', /\.act-walk \.mx-svg\s+\{ animation: mxWalkBob/.test(flat));
ok('蹲下蹬地 → 騰空拉長 → 落地壓扁',
  /@keyframes mxBunHop \{[^@]*scaleY\(\.88\)[^@]*scaleY\(1\.1\)[^@]*scaleY\(\.82\)/.test(flat));
ok('⭐ 後腳蹬、前腳先收（兩組不同的動畫）',
  /@keyframes mxBunHind/.test(flat) && /@keyframes mxBunFore/.test(flat) &&
  /\.pet-bun\.act-walk \.mx-leg-b\s+\{ animation: mxBunFore/.test(flat));
ok('耳朵跟著上下甩', /@keyframes mxBunEar/.test(flat));
ok('帽子也跟著跳（不然帽子會浮在原地）', /\.pet-bun\.act-walk \.mx-hat\s+\{ animation: mxBunHop/.test(flat));

console.log('\n【6】v456：大跳的時候四肢也要演');
ok('⭐ 跳的時候腳有自己的動畫（不再是 animation: none 停在原地）',
  /\.pet-bun\.act-hop \.mx-leg-a,\s*\.pet-bun\.act-hop \.mx-leg-c \{ animation: mxHopHind/.test(flat));
ok('前腳另一套', /\.pet-bun\.act-hop \.mx-leg-b \{ animation: mxHopFore/.test(flat));
ok('⭐ 蹬地時腳往後下方伸', /@keyframes mxHopHind \{[^@]*translateY\(3px\)\s*rotate\(-16deg\)/.test(flat));
ok('⭐ 騰空時把腳收起來（兔子跳起來會縮成一團）',
  /@keyframes mxHopHind \{[^@]*translateY\(-3\.2px\)/.test(flat) && /@keyframes mxHopFore \{[^@]*translateY\(-3\.6px\)/.test(flat));
ok('著地那一格會張開壓扁', /@keyframes mxHopHind \{[^@]*scaleY\(\.78\)/.test(flat));
ok('關掉動畫的人一樣不會看到', /prefers-reduced-motion[\s\S]{0,300}\.pet-bun\.act-walk \.mx-svg/.test(css));

console.log('\n【7】v457：點一下一定要跳、跳到一半不能被打斷、平常只會跳跳跳');
ok('⭐ 點一下一定會表演（招牌權重 2，不再是 45% 機率）',
  /const picks = \(sigOk \? \[pet\.sig, pet\.sig\] : \[\]\)\.concat/.test(fx));
ok('沒招牌也沒買動作才點頭', /const t = reduce\.current \? 'think' : 'nod';/.test(fx));
ok('⭐ 表演期間自動循環先不要插手（busyUntil）',
  /if \(Date\.now\(\) < busyUntil\.current\) \{ later\(doAct/.test(fx));
ok('⭐ 連對五題的點頭也不能插隊（那會讓牠跳到一半掉下來）',
  /runRef\.current % 5 === 0 && Date\.now\(\) >= busyUntil\.current/.test(fx));
ok('做完的大慶祝會等牠演完再放', /const wait = Math\.max\(0, busyUntil\.current - Date\.now\(\)\);/.test(fx));
ok('⭐ 兔子平常只有「跳跳跳」這一種走法（其他動作要點牠或買）', /acts: \['walk'\],/.test(fx));
ok('尾巴會跟著跳', /@keyframes mxTailBob/.test(flat) && /@keyframes mxTailHop/.test(flat));
ok('⭐ 紅蘿蔔變大了（原本 4.6×2 → 6.6×3.2）', /<rect x="7\.6" y="7\.2" width="6\.6" height="3\.2"/.test(fx));
ok('⭐ 啃的動作變大（身體邊啃邊點頭）', /scaleY\(\.84\)\s*scaleX\(1\.14\) rotate\(-3deg\)/.test(flat));
ok('⭐ 腳收窄了（不再像螃蟹一樣開開的）', /x="2" y="12" width="4"/.test(fx) && /x="12" y="12" width="4"/.test(fx));

console.log(fail ? `\n❌ ${fail} failed, ${pass} passed` : `\n🎉 全部通過：${pass} passed, 0 failed`);
process.exit(fail ? 1 : 0);
