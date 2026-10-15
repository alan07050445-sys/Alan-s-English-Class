/* t-bunny — v455 新夥伴「小兔」（Alan 給了一張白兔子參考圖，價格 300，
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
/* ⚠ 「不可以出現」的斷言一定要先把註解拿掉——我這一版的註解裡就引用了被刪掉的那兩條規則，
   第一次跑的時候測試是被我自己的註解打敗的（第五次踩同一個坑了）。 */
const flatNoC = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\n/g, ' ');
const rects = (g) => [...g.matchAll(/x="([\d.]+)"\s+y="([\d.]+)"\s+width="([\d.]+)"\s+height="([\d.]+)"/g)]
  .map(m => m.slice(1, 5).map(Number));
/* v507：關鍵影格改成「解析出來用算的」，不要釘住某一行長什麼樣子。
   這一支測試已經被我自己改壞過一次（v507 調整弧線，13 條斷言全紅，
   但動畫其實是變好的）——釘寫法只證明那行字還在。 */
const kf = (name) => {
  const body = slice(css, '@keyframes ' + name + ' {', '\n}');
  const out = [];
  body.replace(/([\d.%,\s]+)\{([^}]*)\}/g, (m, sel, decl) => {
    sel.split(',').map(x => x.trim()).filter(x => /%$/.test(x))
       .forEach(pc => out.push({ pct: parseFloat(pc), decl }));
    return m;
  });
  return out.sort((a, b) => a.pct - b.pct);
};
const jumpAt = (d) => { const m = /var\(--mx-jump[^)]*\)\s*\*\s*-?([\d.]+)/.exec(d); return m ? parseFloat(m[1]) : 0; };
const syAt   = (d) => { const m = /scaleY\(([\d.]+)\)/.exec(d);  return m ? parseFloat(m[1]) : 1; };
const sxAt   = (d) => { const m = /scaleX\(([\d.]+)\)/.exec(d);  return m ? parseFloat(m[1]) : 1; };

console.log('\n【1】商店裡買得到（300 顆星星）');
const bun = W.MX_BY_ID.pet_bun;
ok('小兔在商品表裡', !!bun);
eq('價格 300', bun.cost, 300);
eq('是「夥伴」這一類', bun.kind, 'pet');
eq('對得到 components-fx.jsx 的 pet id', bun.pet, 'bun');
ok('不是免費的（要用星星請）', !bun.free);
ok('有中文名字與圖示', bun.zh === '小兔' && bun.emoji === '🐰');
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
/* 🔴 v507：這一條本來釘住 { y: 1.2, s: 0.82 }，理由寫「不然會蓋住兩隻耳朵」。
     實測把 8 頂 × 6 隻排出來看才發現**反了**：帽子畫在耳朵後面，被兩隻耳朵
     （x 3~7、11~15）切成三片，只剩中間四個單位看得到＝畫面上一小塊色塊；
     愈縮愈看不到。正解是把帽子畫到耳朵前面，尺寸回到跟其他夥伴同一個量級。 */
ok('⭐ 帽子畫在耳朵前面（畫在後面會被兩隻耳朵切掉）', (() => {
  const iEar = art.indexOf('mx-ear'), iHat = art.indexOf('<MxHat');
  return iEar > 0 && iHat > iEar; })());
ok('⭐ 帽子不再被縮到看不見（跟其他夥伴同一個量級）', (() => {
  const m = /bun:\s*\{ hat: \{ x: [\d.]+,\s*y: (-?[\d.]+),\s*s: ([\d.]+) \}/.exec(fx);
  const others = [...fx.matchAll(/(?:clay|owl|flame|rock|sprout):\s*\{ hat: \{ x: [\d.]+,\s*y: -?[\d.]+,\s*s: ([\d.]+)/g)]
    .map(x => parseFloat(x[1]));
  return m && parseFloat(m[2]) >= Math.min(...others); })());
ok('⭐ 墨鏡不會比臉還寬（兔子的眼睛是 3~7 與 11~15）', (() => {
  const m = /bun:[\s\S]{0,200}?eye: \{ y: [\d.]+,\s*h: [\d.]+,\s*x0: ([\d.]+), x1: ([\d.]+) \}/.exec(fx);
  return m && parseFloat(m[1]) >= 3 && parseFloat(m[2]) <= 15; })());

console.log('\n【3】名冊裡的設定');
ok('MX_PETS 有小兔', /id: 'bun', speed: 1\.1, zh: '小兔'/.test(fx));
ok('招牌動作叫 hop', /sig: 'hop'/.test(fx));
ok('招牌動作的中文寫清楚了', /sigZh: '吃紅蘿蔔＋跳超高'/.test(fx));
ok('⭐ v457：平常只有走路（招牌留給「點一下」，v451 的規矩照舊）', /acts: \['walk'\],/.test(fx));
ok('招牌動作有停留時間（不然一閃而過）', /hop: 3600/.test(fx));
ok('有自己的台詞（含吃紅蘿蔔那幾句）', /卡滋卡滋…好吃 🥕/.test(fx));

console.log('\n【4】吃紅蘿蔔＋跳到螢幕一半');
ok('紅蘿蔔平常看不到', /\.mx-carrot \{ opacity: 0; \}/.test(flat));
ok('只有招牌動作才拿出來啃', /\.pet-bun\.act-hop \.mx-carrot \{ animation: mxCarrot/.test(flat));
ok('⭐ 啃三口愈來愈短（從尖端那一頭啃，所以縮的是 scaleX）', (() => {
  const xs = kf('mxCarrot').filter(f => /scaleX/.test(f.decl)).map(f => sxAt(f.decl));
  const uniq = [...new Set(xs)];
  return uniq.length >= 3 && uniq.every((v, i, a) => i === 0 || v <= a[i - 1]); })());
ok('⭐ 每一口都噴碎屑出來（看得出真的咬到了）',
  /@keyframes mxCrumb/.test(css) && /className="mx-crumbs"/.test(fx)
  && (fx.match(/className="mx-crumb /g) || []).length >= 3);
ok('縮放原點在右邊（尖端在左邊，從左邊啃）', /\.pet-bun\.act-hop \.mx-carrot \{ transform-origin: 92% 50%; \}/.test(flat));
ok('紅蘿蔔橫著拿到嘴邊（不是插在胸前）', (() => {
  const g = slice(art, 'className="mx-carrot"', '</g>');
  const rs = rects(g);
  if (rs.length < 4) return false;
  const x0 = Math.min(...rs.map(r => r[0])), x1 = Math.max(...rs.map(r => r[0] + r[2]));
  const y0 = Math.min(...rs.map(r => r[1])), y1 = Math.max(...rs.map(r => r[1] + r[3]));
  return (x1 - x0) > (y1 - y0) && y0 >= 4 && y1 <= 14; })());
ok('⭐ 是一根「尖端細、根部粗」的紅蘿蔔，不是一個長方形', (() => {
  const g = slice(art, 'className="mx-carrot"', '</g>');
  const body = rects(g).map(r => [r[0], r[3]]).filter(r => r[0] < 14.3).sort((a, b) => a[0] - b[0]);
  return body.length >= 4 && body[body.length - 1][1] > body[0][1] * 1.8; })());
ok('⭐ 有一條可愛的毛球尾巴', /className="mx-tail"/.test(fx) && /rx="2\.2"/.test(fx));
ok('⭐ 跳的高度用變數（vh 在矮視窗／iPad 網址列伸縮時會算得很小，甚至 0）',
  /--mx-jump: clamp\(150px, 44vh, 520px\)/.test(flat));
ok('⭐ 變數萬一沒定義也有退路（不然那一格會失效＝整個跳不起來）',
  /var\(--mx-jump, 44vh\)/.test(flat) && flat.indexOf('var(--mx-jump)') < 0);
ok('最高點＝一整個 --mx-jump', /translateY\(calc\(var\(--mx-jump, 44vh\) \* -1\)\)/.test(flat));
/* v507：大跳的弧線改成用算的。守的是「看起來有重力」的四個條件，
   不是某一格剛好寫幾 px。 */
const HOP = kf('mxHop');
const apexPct = HOP.filter(f => jumpAt(f.decl) >= 0.999).map(f => f.pct);
ok('⭐ 最高點就是「半個畫面」（--mx-jump 的 1 倍）', apexPct.length >= 1);
ok('⭐ 最高點停一下（滯空感：至少兩格維持在最高）', apexPct.length >= 2);
ok('⭐ 起跳前有蹲下蓄力（比平常更扁，而且在起跳之前）', (() => {
  const launch = Math.min(...apexPct);
  const crouch = HOP.filter(f => f.pct < launch && syAt(f.decl) <= 0.72);
  return crouch.length >= 1 && Math.max(...crouch.map(f => f.pct)) > launch - 20; })());
ok('⭐ 起跳那一格身體拉長（squash & stretch）', (() => {
  const launch = Math.min(...apexPct);
  return HOP.some(f => f.pct < launch && f.pct > launch - 15 && syAt(f.decl) >= 1.2); })());
ok('⭐ 落地會壓扁、再彈一小下', (() => {
  const apex = Math.max(...apexPct);
  const after = HOP.filter(f => f.pct > apex);
  return after.some(f => syAt(f.decl) <= 0.78 && sxAt(f.decl) >= 1.15)
      && after.some(f => jumpAt(f.decl) > 0 && jumpAt(f.decl) < 0.3); })());
ok('⭐ 不是等速電梯——每一段有自己的加速度', (() => {
  const body = slice(css, '@keyframes mxHop {', '\n}');
  return (body.match(/animation-timing-function/g) || []).length >= 5; })());
ok('⭐ 上升與下降的加速度不一樣（上去愈來愈慢、下來愈來愈快）', (() => {
  const body = slice(css, '@keyframes mxHop {', '\n}');
  const fns = [...body.matchAll(/animation-timing-function:\s*([^;]+);/g)].map(m => m[1].trim());
  return new Set(fns).size >= 3; })());
ok('⭐ 落地與起跳都有塵土（看得出是踩著地板彈起來的）', (() => {
  if (!/className="mx-dust"/.test(fx) || !/@keyframes mxDust/.test(css)) return false;
  const vis = kf('mxDust').filter(f => { const m = /opacity:\s*([\d.]+)/.exec(f.decl); return m && parseFloat(m[1]) > 0.2; });
  const launch = Math.min(...apexPct), apex = Math.max(...apexPct);
  // 蹬地噴一次（在最高點之前）、落地再噴一次（在最高點之後）
  return vis.some(f => f.pct < launch) && vis.some(f => f.pct > apex); })());
ok('   騰空的時候不要有塵土（牠在半空中，腳下沒有地板）', (() => {
  const launch = Math.min(...apexPct), apex = Math.max(...apexPct);
  const mid = kf('mxDust').filter(f => f.pct > launch && f.pct < apex);
  return mid.every(f => { const m = /opacity:\s*([\d.]+)/.exec(f.decl); return !m || parseFloat(m[1]) < 0.2; }); })());
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
/* 🔴 v507：這一條本來要求「帽子要自己再跑一次同一支動畫」。那是帽子還是**另一個
     疊在上面的 svg** 的年代留下來的；v441 之後帽子畫在同一個 <svg> 裡，
     再套一次就是疊第二次——而且掛在 <g> 上的 px 是「SVG 使用者單位」，
     -11px 等於 -11 個單位≒28 螢幕像素，帽子整個飛到耳朵上面。 */
ok('⭐ 帽子不可以自己再跑一次動畫（它已經在會動的 svg 裡面了）',
  !/\.mx-hat\s*\{\s*animation:\s*mxBunHop/.test(flatNoC)
  && !/\.act-walk\s+\.mx-hat\s*\{\s*animation:\s*mxWalkBob/.test(flatNoC)
  && !/\.act-dance\s+\.mx-hat\s*\{\s*animation:\s*mxDance/.test(flatNoC));
ok('   打電腦那一組要留著（只動 .mx-torso、沒動 .mx-svg，帽子確實要自己跟）',
  /\.act-type \.mx-torso\s*\{ animation: mxType/.test(flat)
  && /\.act-type \.mx-hat\s*\{\s*animation: mxType/.test(flat));

console.log('\n【6】v456：大跳的時候四肢也要演');
ok('⭐ 跳的時候腳有自己的動畫（不再是 animation: none 停在原地）',
  /\.pet-bun\.act-hop \.mx-leg-a,\s*\.pet-bun\.act-hop \.mx-leg-c \{ animation: mxHopHind/.test(flat));
ok('前腳另一套', /\.pet-bun\.act-hop \.mx-leg-b \{ animation: mxHopFore/.test(flat));
const tyAt = (d) => { const m = /translateY\((-?[\d.]+)px\)/.exec(d); return m ? parseFloat(m[1]) : 0; };
ok('⭐ 蹬地時後腳往後下方伸（先往下、而且轉出去）',
  kf('mxHopHind').some(f => tyAt(f.decl) >= 2 && /rotate\(-\d/.test(f.decl)));
ok('⭐ 騰空時把腳收起來（兔子跳起來會縮成一團）',
  kf('mxHopHind').some(f => tyAt(f.decl) <= -3) && kf('mxHopFore').some(f => tyAt(f.decl) <= -3));
ok('著地那一格會張開壓扁', kf('mxHopHind').some(f => syAt(f.decl) <= 0.8));
ok('關掉動畫的人一樣不會看到', /prefers-reduced-motion[\s\S]{0,300}\.pet-bun\.act-walk \.mx-svg/.test(css));

console.log('\n【7】v457：點一下一定要跳、跳到一半不能被打斷、平常只會跳跳跳');
ok('⭐ 點一下一定會表演（招牌權重 2，不再是 45% 機率）',
  /const picks = \(sigOk \? \[pet\.sig, pet\.sig\] : \[\]\)\.concat/.test(fx));
ok('沒招牌也沒買動作才點頭', /const t = reduce\.current \? 'think' : 'nod';/.test(fx));
ok('⭐ 表演期間自動循環先不要插手（busyUntil）',
  /if \(Date\.now\(\) < busyUntil\.current\) \{ later\(doAct/.test(fx));
ok('⭐ 連對五題的點頭也不能插隊（那會讓牠跳到一半掉下來）',
  /runRef\.current % 5 === 0\) startAct\('nod'/.test(fx) && !/startAct\('nod', \d+, \{ force/.test(fx));
ok('做完的大慶祝會等牠演完再放', /const wait = Math\.max\(0, busyUntil\.current - Date\.now\(\)\);/.test(fx));
ok('⭐ 兔子平常只有「跳跳跳」這一種走法（其他動作要點牠或買）', /acts: \['walk'\],/.test(fx));
ok('尾巴會跟著跳', /@keyframes mxTailBob/.test(flat) && /@keyframes mxTailHop/.test(flat));
ok('⭐ 紅蘿蔔夠大（看得出是紅蘿蔔，不是一小撮橘色）', (() => {
  const g = slice(art, 'className="mx-carrot"', '</g>');
  const rs = rects(g);
  const x0 = Math.min(...rs.map(r => r[0])), x1 = Math.max(...rs.map(r => r[0] + r[2]));
  return (x1 - x0) >= 6; })());
ok('⭐ 啃的動作變大（身體邊啃邊點頭，不是只有紅蘿蔔在縮）', (() => {
  const apex = Math.min(...kf('mxHop').filter(f => jumpAt(f.decl) >= 0.999).map(f => f.pct));
  const eat = kf('mxHop').filter(f => f.pct < apex - 10);
  return eat.filter(f => /rotate\(-?[1-9]/.test(f.decl)).length >= 3
      && eat.some(f => syAt(f.decl) <= 0.85); })());
ok('⭐ 腳收窄了（不再像螃蟹一樣開開的）', /x="2" y="12" width="4"/.test(fx) && /x="12" y="12" width="4"/.test(fx));


console.log('\n【v459】小兔改名＋偶爾往左右跳＋非 iPad 也長得出選單');
ok('⭐ 商店裡叫「小兔」（不再是小跳）', bun.zh === '小兔' && !/小跳/.test(JSON.stringify(bun)));
ok('⭐ 大跳會橫向飄（hopSideways）', /const hopSideways = \(\) => \{/.test(fx));
ok('水平用 .mx-slot 本來就有的 transition（跟垂直的 keyframe 疊成拋物線）',
   /hopSideways[\s\S]{0,1400}setMoveMs\(HOP_AIR_MS\);[\s\S]{0,60}setX\(target\)/.test(fx));
ok('⭐ v507：一次只能排一個橫移（連點兩下本來會疊成瞬移）',
   /if \(hopT\.current\) return;/.test(fx) && /hopT\.current = later\(/.test(fx));
ok('時機對著 mxHop 的起跳（約 1.5 秒）', /HOP_AIR_AT = 14\d\d/.test(fx));
ok('是「偶爾」不是每次', /if \(Math\.random\(\) < 0\.4\) return;/.test(fx));
ok('起跳位置從 DOM 當場量（doAct 裡的 x 是舊值，會算反方向）',
   /hopSideways[\s\S]{0,600}DOMMatrixReadOnly/.test(fx));
ok('不會跳出畫面（有夾在 0~W 之間）', /target = Math\.max\(0, Math\.min\(W, target\)\)/.test(fx));
ok('太短就不飄（看不出來反而像抖動）', /Math\.abs\(target - cur\) < 45/.test(fx));
ok('減少動態的人不飄', /hopSideways = \(\) => \{\s*\n\s*if \(reduce\.current\) return;/.test(fx));
ok('三個觸發點都接上（自動循環／點一下／換夥伴打招呼）',
   (fx.match(/hopSideways\(\)/g) || []).length >= 3);

ok('⭐ 攔掉瀏覽器的長按選單（Android 平板會跳出網站設定）', /onContextMenu=\{\(e\) => \{\s*\n\s*e\.preventDefault\(\);/.test(fx));
ok('⭐ 而且把它當成「要開我們的選單」，不是只擋掉', /onContextMenu[\s\S]{0,260}setMenu\(true\)/.test(fx));
ok('長按門檻提前到 500ms（要趕在瀏覽器自己的長按之前）', /\}, 500\);/.test(fx));
ok('⭐ 還有一條看得到的路：點一下會冒出「⋯」', /className="mx-handle"/.test(fx) && /showHandle\(\)/.test(fx));
ok('「⋯」五秒後自己收掉，不佔畫面', /setTimeout\(\(\) => setHandle\(false\), 5000\)/.test(fx));
ok('CSS 也把選字／存圖關掉（只靠 JS 擋不乾淨）',
   /-webkit-touch-callout: none/.test(css) && /user-select: none/.test(css));
ok('「⋯」自己打開 pointer-events（.mx-layer 是 none）', /\.mx-handle \{[\s\S]{0,300}pointer-events: auto/.test(css));

console.log(fail ? `\n❌ ${fail} failed, ${pass} passed` : `\n🎉 全部通過：${pass} passed, 0 failed`);
process.exit(fail ? 1 : 0);
