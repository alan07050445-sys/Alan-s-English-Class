// components-fx.jsx — v375
// ① 吉祥物 Claudius（像素風小傢伙）：會走路、跳、翻滾、打瞌睡、答對時比讚
// ② 完成特效：彩帶 + 音效（QmCelebrate / window.spawnConfetti 都走這裡）
// 這一層是獨立掛載的（自己 append 一個 div 到 body），不動 App 的樹，
// 所以任何頁面都看得到，也不會影響原本的版面計算。

const { useState: useFx, useEffect: useFxE, useRef: useFxR } = React;

/* ── 像素風吉祥物 ────────────────────────────────────────────
   9×8 的格子：頭上兩個小角、兩顆方眼睛、三隻腳。
   腳分成三塊，走路時左右腳輪流抬起來。 */
/* v385（Alan）：帽子不再「自動解鎖」，改成商店裡用星星買的東西。
   v431：全部搬到 data.js 的 MX_SHOP（頭飾／配件／特效／語音／動作一起賣），
   這裡只留「怎麼畫」。舊的兩頂（party／crown，老師手動扣點買的）畫法一模一樣，
   id 也還認得，戴著的人不會突然變成沒戴。
   ⚠ 座標在 18×20 的格子裡（見下面 v402 的說明）：y −4~0 是頭上的地盤，
     身體 y2~12、腳 y12~16，所以配件畫在 y2 以下。 */
const MX_HATS = [
  { id: 'party', zh: '派對帽', cost: 500 },
  { id: 'crown', zh: '皇冠',   cost: 1000 },
];
const MX_HAT_ART = {
  hat_party: (
    <g className="mx-hat">
      <rect x="8" y="-4" width="2" height="2" fill="#E8C86A"/>
      <rect x="6" y="-2" width="6" height="2" fill="#D6533C"/>
    </g>
  ),
  hat_crown: (
    <g className="mx-hat">
      <rect x="4"  y="-4" width="2" height="2" fill="#E8C86A"/>
      <rect x="8"  y="-4" width="2" height="2" fill="#E8C86A"/>
      <rect x="12" y="-4" width="2" height="2" fill="#E8C86A"/>
      <rect x="4"  y="-2" width="10" height="2" fill="#E8C86A"/>
    </g>
  ),
  hat_cap: (           /* 鴨舌帽：帽身＋右邊帽簷 */
    <g className="mx-hat">
      <rect x="3"  y="-3" width="12" height="3" fill="#2E6F9E"/>
      <rect x="12" y="-1" width="6"  height="1" fill="#24567A"/>
    </g>
  ),
  hat_grad: (          /* 畢業帽：方板＋帽身＋流蘇 */
    <g className="mx-hat">
      <rect x="2"  y="-2" width="14" height="1" fill="#2B2A26"/>
      <rect x="6"  y="-4" width="6"  height="2" fill="#3A3833"/>
      <rect x="15" y="-2" width="1"  height="3" fill="#E8C86A"/>
    </g>
  ),
  hat_flower: (        /* 小花：四片花瓣＋花心，戴在右邊 */
    <g className="mx-hat">
      <rect x="12" y="-4" width="2" height="2" fill="#E39AB8"/>
      <rect x="10" y="-2" width="2" height="2" fill="#E39AB8"/>
      <rect x="14" y="-2" width="2" height="2" fill="#E39AB8"/>
      <rect x="12" y="-2" width="2" height="2" fill="#E8C86A"/>
      <rect x="12" y="0"  width="2" height="1" fill="#2E7D5B"/>
    </g>
  ),
  hat_bunny: (         /* 兔耳朵：兩隻長耳＋粉紅內耳 */
    <g className="mx-hat">
      <rect x="3.5"  y="-4" width="3" height="4.5" fill="#B9AE95"/>
      <rect x="11.5" y="-4" width="3" height="4.5" fill="#B9AE95"/>
      <rect x="4"  y="-3.5" width="2" height="4" fill="#FBF6EA"/>
      <rect x="12" y="-3.5" width="2" height="4" fill="#FBF6EA"/>
      <rect x="4.5"  y="-3" width="1" height="2" fill="#E39AB8"/>
      <rect x="12.5" y="-3" width="1" height="2" fill="#E39AB8"/>
    </g>
  ),
  hat_horn: (          /* 小鹿角 */
    <g className="mx-hat">
      <rect x="4"  y="-3" width="1" height="3" fill="#8A5A33"/>
      <rect x="2"  y="-4" width="1" height="2" fill="#8A5A33"/>
      <rect x="13" y="-3" width="1" height="3" fill="#8A5A33"/>
      <rect x="15" y="-4" width="1" height="2" fill="#8A5A33"/>
    </g>
  ),
  hat_star: (          /* 星星髮箍 */
    <g className="mx-hat">
      <rect x="2"  y="-1" width="14" height="1" fill="#8A5FA8"/>
      <rect x="12" y="-4" width="2"  height="2" fill="#E8C86A"/>
      <rect x="11" y="-3" width="4"  height="1" fill="#E8C86A"/>
      <rect x="11.5" y="-2" width="1" height="1" fill="#E8C86A"/>
      <rect x="13.5" y="-2" width="1" height="1" fill="#E8C86A"/>
    </g>
  ),
};
function MxHat({ id }) {
  const key = id === 'party' ? 'hat_party' : id === 'crown' ? 'hat_crown' : id;
  return MX_HAT_ART[key] || null;
}
/* v431：配件畫成「疊在身上的一層」——同一個 viewBox 蓋在吉祥物上面，
   所以五隻夥伴都不用改，換哪一隻都對得準。 */
const MX_ACC_ART = {
  it_bow: (
    <g>
      <rect x="6"  y="2" width="2" height="2" fill="#D6533C"/>
      <rect x="10" y="2" width="2" height="2" fill="#D6533C"/>
      <rect x="8"  y="2.5" width="2" height="1" fill="#B23A28"/>
    </g>
  ),
  it_scarf: (
    <g>
      <rect x="0"  y="8"  width="18" height="2" fill="#C1454A"/>
      <rect x="13" y="10" width="2"  height="4" fill="#C1454A"/>
      <rect x="13" y="13" width="2"  height="1" fill="#8E3034"/>
    </g>
  ),
  it_glass: (
    <g>
      <rect x="1"  y="4" width="6" height="3" fill="#2B2A26"/>
      <rect x="11" y="4" width="6" height="3" fill="#2B2A26"/>
      <rect x="7"  y="5" width="4" height="1" fill="#2B2A26"/>
      <rect x="2"  y="4.5" width="1.5" height="1" fill="#6E6A60"/>
    </g>
  ),
  it_bag: (
    <g>
      <rect x="0" y="8"  width="3" height="5" fill="#2E7D5B"/>
      <rect x="0" y="10" width="3" height="1" fill="#1F5B41"/>
      <rect x="3" y="7"  width="1" height="5" fill="#1F5B41"/>
    </g>
  ),
  it_cape: (
    <g>
      <polygon points="0,3 2.5,3 2.5,15 0,15" fill="#8A2F3B"/>
      <rect x="0" y="2" width="4" height="1" fill="#6E2430"/>
    </g>
  ),
  it_wand: (
    <g>
      <rect x="15" y="6" width="1" height="8" fill="#6B5B45"/>
      <rect x="14" y="4" width="3" height="1" fill="#E8C86A"/>
      <rect x="15" y="3" width="1" height="3" fill="#E8C86A"/>
    </g>
  ),
};
function MxAcc({ id }) {
  const art = MX_ACC_ART[id];
  if (!art) return null;
  return (
    <svg className="mx-acc" viewBox="0 -4 18 20" shapeRendering="crispEdges" aria-hidden="true">{art}</svg>
  );
}
/* v431：語音包＝牠說話的口氣（買了就換一種講法）。答對、打招呼、耍寶都吃這一份。 */
const MX_VOICE = {
  vo_cheer: { win: ['太棒了！再一題！', '你超強的！', '就是這樣！衝！'], hello: ['我們開始吧！', '今天也要加油！'], idle: ['你可以的！'] },
  vo_cat:   { win: ['答對了喵～', '好厲害喵！', '喵嗚～滿分！'], hello: ['喵～你來啦', '今天也要一起喵'], idle: ['喵…'] },
  vo_robot: { win: ['嗶——正確——', '答案-正-確-', '系統顯示：很強'], hello: ['嗶。啟動完成。', '偵測到同學一名'], idle: ['嗶…嗶…'] },
  vo_eng:   { win: ['Great job!', 'You got it!', 'Awesome!'], hello: ['Hi there!', "Let's study!"], idle: ['Nice work!'] },
};

/* ══ v404（Alan：「我讓小寵物去休息，其他人的帳號也跟著休息——我都用同一台電腦」）══
   吉祥物的四樣設定（帽子／名字／休息到哪天／挑了哪一隻）本來全部存在
   localStorage 的固定 key ＝ **跟著這台電腦走，不跟著帳號走**。
   Alan 一台電腦要登老師與學生好幾個帳號，他讓夥伴去休息，全部人都跟著不見。
   改成每個帳號一把 key，寫法照抄 app.jsx 的 homeGradeKey()
   （'alan-home-grade:' + uid，那裡的註解就寫著「共用電腦的手足各自獨立」）。
   ⚠ 沒登入時退回原本的公用 key——訪客本來就沒有帳號可以掛。
   ⚠ window._currentUser 是 app.jsx 在 subscribeAuth 裡設的；登入前是 null，
     所以下面每一個 get/set 都要「當下」算 key，不能在模組載入時算好存起來。 */
function mxUid() {
  try { return (window._currentUser && window._currentUser.uid) || ''; } catch (e) { return ''; }
}
function mxKey(base) { const uid = mxUid(); return uid ? base + ':' + uid : base; }
/* 一次性搬家：舊的公用值搬給「更新後第一個登入的帳號」，然後把公用 key 刪掉，
   後面的帳號就是全新的。刻意**不搬 alan-mx-off（休息）**——那正是 Alan 回報的問題，
   誰的休息都不該跟著別人走，所以一律清掉、大家醒著。 */
function mxMigrateOnce() {
  try {
    const uid = mxUid();
    if (!uid) return;
    localStorage.removeItem('alan-mx-off');          // 舊的公用「休息」直接作廢
    ['alan-mx-hat', 'alan-mx-name', 'alan-mx-pet'].forEach(base => {
      const old = localStorage.getItem(base);
      if (old == null) return;
      if (localStorage.getItem(base + ':' + uid) == null) localStorage.setItem(base + ':' + uid, old);
      localStorage.removeItem(base);
    });
  } catch (e) {}
}

/* v431：戴什麼不再存在這台電腦的 localStorage，而是存在帳號的 progress/{uid}.mx.wear
   （data.js mxWearOf）——換一台裝置、換一個帳號都跟著人走，不會互相影響。
   舊的 alan-mx-hat 只剩「以前買過帽子的人第一次進來自動幫他戴上」這一個用途。 */
const MX_HAT_KEY = 'alan-mx-hat';
function mxOwnedHats() { return (window.__mxHats || []).filter(h => MX_HATS.some(x => x.id === h)); }
function mxGetHat() { try { return localStorage.getItem(mxKey(MX_HAT_KEY)) || ''; } catch (e) { return ''; } }
function mxSetHat(h) { try { localStorage.setItem(mxKey(MX_HAT_KEY), h || ''); } catch (e) {} }

/* ══════════════════════════════════════════════════════════════════════════
   夥伴圖鑑（v401 建立；v402 全部重畫）
   ──────────────────────────────────────────────────────────────────────────
   v402（Alan：「新的幾隻畫素太低、不夠清楚」）：網格從 9×10 加倍成 **18×20**。
   · Claudius 的每一格照 1:1 放大成 2×2 ——**畫出來跟以前一模一樣**，
     一格仍然是 5.5px（--mx-w 50px ÷ 9），所以「像素的顆粒感」沒有變。
   · 多出來的解析度全部給新夥伴：喙、葉子、火苗的收邊這些以前只能用 1 格
     （＝5.5px 的一塊色）硬擠的細節，現在可以用半格畫，看起來才是「同一種畫風
     的另一隻」，而不是更粗糙的版本。
   ⚠ 骨架不變：一定要有 .mx-torso（身體＋兩顆 .mx-eye）與 .mx-leg-a/b/c，
     走路／跳／轉圈／翻滾／打瞌睡那十幾支 CSS 動畫全都掛在這些 class 上。
   ⚠ viewBox 一律 "0 -4 18 20"（比例仍是 9:10，.mx-svg 的寬高算法不用改）。
     y −4~0 是帽子的地盤，所以頭上的裝飾（葉子、耳羽、火苗尖端）都從 y0 開始。
   ⚠ 改網格要連 styles-fx.css 裡「掛在 <g> 上」的動畫一起加倍
     （mxStep／mxType／mxRead／mxLeaf ——它們的 px 是 SVG 使用者單位；
      掛在 .mx-svg 上的那些是真的 CSS px，不能動）。
   ⚠ 這幾隻是照 Alan 喜歡的方向（火／貓頭鷹／石頭／幼苗這種通用形象）另外畫的，
     不是把別家產品的角色搬過來——配色也換成本站的紙感色票，跟整體才搭。 */

/* ① Claudius —— 原本那隻，永遠是預設（座標全部 ×2，外觀完全沒變） */
function ClaudeMascot({ size = 46, hat = 'none' }) {
  const CLAY = '#C1785A', EYE = '#1A1A1A';
  return (
    <svg className="mx-svg" width={size} height={size * 10 / 9} viewBox="0 -4 18 20"
      shapeRendering="crispEdges" aria-hidden="true">
      <MxHat id={hat}/>
      <g className="mx-torso">
        {/* 頭上的兩個小角 */}
        <rect x="2" y="0" width="2" height="2" fill={CLAY}/>
        <rect x="14" y="0" width="2" height="2" fill={CLAY}/>
        {/* 身體（維持參考圖的平塗，不加陰影，才像素風） */}
        <rect x="0" y="2" width="18" height="10" fill={CLAY}/>
        {/* 眼睛（會眨） */}
        <rect className="mx-eye" x="2" y="4" width="4" height="4" fill={EYE}/>
        <rect className="mx-eye" x="12" y="4" width="4" height="4" fill={EYE}/>
      </g>
      <g className="mx-leg mx-leg-a"><rect x="0" y="12" width="4" height="4" fill={CLAY}/></g>
      <g className="mx-leg mx-leg-b"><rect x="6" y="12" width="6" height="4" fill={CLAY}/></g>
      <g className="mx-leg mx-leg-c"><rect x="14" y="12" width="4" height="4" fill={CLAY}/></g>
      {/* 招牌動作：打電腦（Alan 指定）——小筆電擋在腳前面，看起來就像坐在桌子後面 */}
      <g className="mx-prop mx-prop-type">
        <rect x="2" y="9" width="14" height="5" fill="#4A443A"/>
        <rect x="3" y="10" width="12" height="3" fill="#9FD8BC"/>
        <rect x="0" y="14" width="18" height="2" fill="#6B6355"/>
      </g>
    </svg>
  );
}

/* ② 咕咕（貓頭鷹）—— 眼睛大、愛看書，走得少想得多 */
function OwlMascot({ size = 46, hat = 'none' }) {
  const BODY = '#A9713F', DARK = '#7A4E27', RING = '#FBF6EA', BEAK = '#E8A33C',
        BELLY = '#E4C79B', EYE = '#1A1A1A';
  return (
    <svg className="mx-svg" width={size} height={size * 10 / 9} viewBox="0 -4 18 20"
      shapeRendering="crispEdges" aria-hidden="true">
      <MxHat id={hat}/>
      <g className="mx-torso">
        {/* 耳羽 */}
        <rect x="2" y="0" width="3" height="2" fill={DARK}/>
        <rect x="13" y="0" width="3" height="2" fill={DARK}/>
        {/* 頭身：兩側各縮一格，剪影才是圓的而不是一塊方磚 */}
        <rect x="1" y="2" width="16" height="2" fill={BODY}/>
        <rect x="0" y="4" width="18" height="6" fill={BODY}/>
        <rect x="1" y="10" width="16" height="2" fill={BODY}/>
        <rect x="5" y="9" width="8" height="3" fill={BELLY}/>
        {/* 眼盤：外圈留一格白，瞳孔才不會黏在棕色上 */}
        <rect x="2" y="3" width="6" height="6" fill={RING}/>
        <rect x="10" y="3" width="6" height="6" fill={RING}/>
        <rect className="mx-eye" x="3" y="4" width="4" height="4" fill={EYE}/>
        <rect className="mx-eye" x="11" y="4" width="4" height="4" fill={EYE}/>
        {/* 喙：舊版只有 1 格（一塊色），現在收成上寬下窄的小三角 */}
        <rect x="8" y="6" width="2" height="2" fill={BEAK}/>
        <rect x="8" y="8" width="1" height="1" fill={BEAK}/>
      </g>
      <g className="mx-leg mx-leg-a"><rect x="3" y="12" width="4" height="3" fill={BEAK}/></g>
      <g className="mx-leg mx-leg-b"/>
      <g className="mx-leg mx-leg-c"><rect x="11" y="12" width="4" height="3" fill={BEAK}/></g>
      {/* 招牌動作：看書 */}
      <g className="mx-prop mx-prop-read">
        <rect x="2" y="10" width="14" height="6" fill="#8B3120"/>
        <rect x="3" y="10" width="6" height="4" fill="#FBF6EA"/>
        <rect x="10" y="10" width="6" height="4" fill="#FBF6EA"/>
        <rect x="4" y="11" width="4" height="1" fill="#D8CBB0"/>
        <rect x="11" y="11" width="4" height="1" fill="#D8CBB0"/>
      </g>
    </svg>
  );
}

/* ③ 小焰（火苗）—— 靜不下來，跑超快 */
function FlameMascot({ size = 46, hat = 'none' }) {
  const OUT = '#D6533C', MID = '#E8873C', IN = '#F2C14E', EYE = '#3A1B12';
  return (
    <svg className="mx-svg" width={size} height={size * 10 / 9} viewBox="0 -4 18 20"
      shapeRendering="crispEdges" aria-hidden="true">
      <MxHat id={hat}/>
      <g className="mx-torso">
        {/* 2→6→10→14→16 一層一層變寬，收邊才像火不像方塊 */}
        <rect x="8" y="0" width="2" height="2" fill={IN}/>
        <rect x="6" y="2" width="6" height="2" fill={IN}/>
        <rect x="4" y="4" width="10" height="2" fill={MID}/>
        <rect x="2" y="6" width="14" height="2" fill={OUT}/>
        <rect x="1" y="8" width="16" height="4" fill={OUT}/>
        <rect x="6" y="9" width="6" height="3" fill={MID}/>
        <rect className="mx-eye" x="4" y="7" width="4" height="4" fill={EYE}/>
        <rect className="mx-eye" x="10" y="7" width="4" height="4" fill={EYE}/>
      </g>
      <g className="mx-leg mx-leg-a"><rect x="1" y="12" width="4" height="3" fill={MID}/></g>
      <g className="mx-leg mx-leg-b"><rect x="6" y="12" width="6" height="4" fill={IN}/></g>
      <g className="mx-leg mx-leg-c"><rect x="13" y="12" width="4" height="3" fill={MID}/></g>
    </svg>
  );
}

/* ④ 阿石（小石頭）—— 慢吞吞，最愛裝成路邊一顆普通的石頭 */
function RockMascot({ size = 46, hat = 'none' }) {
  const ROCK = '#9A9384', DARK = '#6E695D', LIGHT = '#C4BDAC', EYE = '#1A1A1A';
  return (
    <svg className="mx-svg" width={size} height={size * 10 / 9} viewBox="0 -4 18 20"
      shapeRendering="crispEdges" aria-hidden="true">
      <MxHat id={hat}/>
      <g className="mx-torso">
        {/* 上緣切一角、左右各縮一格＝石頭的不規則感 */}
        <rect x="5" y="0" width="9" height="2" fill={LIGHT}/>
        <rect x="2" y="2" width="14" height="2" fill={ROCK}/>
        <rect x="1" y="4" width="16" height="8" fill={ROCK}/>
        <rect x="6" y="2" width="4" height="1" fill={LIGHT}/>
        <rect x="13" y="9" width="2" height="2" fill={DARK}/>
        <rect className="mx-eye" x="3" y="5" width="4" height="4" fill={EYE}/>
        <rect className="mx-eye" x="11" y="5" width="4" height="4" fill={EYE}/>
        <rect x="8" y="10" width="2" height="1" fill={DARK}/>
      </g>
      <g className="mx-leg mx-leg-a"><rect x="2" y="12" width="4" height="3" fill={DARK}/></g>
      <g className="mx-leg mx-leg-b"><rect x="7" y="12" width="4" height="4" fill={ROCK}/></g>
      <g className="mx-leg mx-leg-c"><rect x="12" y="12" width="4" height="3" fill={DARK}/></g>
    </svg>
  );
}

/* ⑤ 小芽（幼苗）—— 好奇寶寶，開心的時候會長高一點點 */
function SproutMascot({ size = 46, hat = 'none' }) {
  const SEED = '#D8C79B', DEEP = '#B99F6B', LEAF = '#6FA85A', STEM = '#4E7A3F', EYE = '#3A3222';
  return (
    <svg className="mx-svg" width={size} height={size * 10 / 9} viewBox="0 -4 18 20"
      shapeRendering="crispEdges" aria-hidden="true">
      <MxHat id={hat}/>
      {/* 葉子從 y0 開始長，帽子（y−4~0）才不會壓在葉子上 */}
      {/* v408：莖獨立成一組。長高的時候葉子會往上移 5 個單位，
          本來沒有東西接住它 → 葉子整片飄在半空、跟身體斷開（實測 --mx-w 120px 時斷了 27px）。
          莖從腳下往上拉長把中間補起來，看起來才是「莖抽高、葉子被頂上去」。
          ⚠ 要畫在葉子前面（葉子蓋在莖上），不然莖的頂端會壓在葉片中間。 */}
      <g className="mx-stem"><rect x="8" y="0" width="2" height="2" fill={STEM}/></g>
      <g className="mx-leaf">
        <rect x="4" y="0" width="4" height="2" fill={LEAF}/>
        <rect x="3" y="1" width="1" height="1" fill={LEAF}/>
        <rect x="10" y="0" width="4" height="2" fill={LEAF}/>
        <rect x="14" y="1" width="1" height="1" fill={LEAF}/>
      </g>
      <g className="mx-torso">
        <rect x="1" y="2" width="16" height="2" fill={SEED}/>
        <rect x="0" y="4" width="18" height="8" fill={SEED}/>
        <rect x="0" y="10" width="18" height="2" fill={DEEP}/>
        <rect className="mx-eye" x="3" y="5" width="4" height="4" fill={EYE}/>
        <rect className="mx-eye" x="11" y="5" width="4" height="4" fill={EYE}/>
        <rect x="8" y="8" width="2" height="1" fill={DEEP}/>
      </g>
      <g className="mx-leg mx-leg-a"><rect x="0" y="12" width="4" height="4" fill={DEEP}/></g>
      <g className="mx-leg mx-leg-b"><rect x="7" y="12" width="4" height="4" fill={DEEP}/></g>
      <g className="mx-leg mx-leg-c"><rect x="14" y="12" width="4" height="4" fill={DEEP}/></g>
    </svg>
  );
}

/* ── 台詞（鼓勵為主，偶爾耍笨；不嘲諷小孩）────────────────── */
const MX_LINES = {
  hello:   ['嗨！我陪你唸書 📚', '今天也要加油喔！', '我又出現了 👀', '你在唸什麼？我也想學', '長按我可以幫我取名字 ✏️'],
  correct: ['答對了 🎉', '好強！', '就是這個！', '欸你很可以耶 😎', '再來再來！'],
  wrong:   ['沒關係，再試一次 💪', '差一點點！', '我剛剛也選錯 😅', '深呼吸，再看一次'],
  win:     ['全部做完啦 🎊', '太神啦！', '今天的你超棒 ⭐', '我要放鞭炮了 🎆'],
  idle:    ['我在散步 🚶', '腳有點酸…', '這裡風景不錯', '要不要摸摸我', '我在數格子 1、2、3…'],
  tap:     ['哇！你摸到我了', '嘿嘿 😆', '再點我會轉圈喔', '好癢好癢', '我可是很忙的（其實沒有）'],
  sleep:   ['💤', '呼…呼…', '睡一下下就好'],
};
/* v392（D）：每個桶只有 3~5 句，連續抽到同一句的機率高達 20~33%，
   「我在散步 🚶」連講兩次會讓人以為壞掉。抽到跟上一句一樣就重抽「一次」——
   只重抽一次，桶裡只有 3 句時才不會變成死迴圈。台詞內容一個字都沒改。 */
const lastSaid = {};
/* v401：第二個參數是「現在是哪一隻夥伴」。牠自己有寫這一類的台詞就用牠的，
   沒寫就退回共用的那組（correct/wrong/win/tap 全部共用，不必每隻都重寫一遍）。 */
/* v431：買了語音包就換一種口氣講話；沒有買（或這一句語音包沒寫）就照原本的。 */
const mxLine = (k, pet, voice) => {
  const v = MX_VOICE[voice];
  const arr = v && v[k];
  if (arr && arr.length) return arr[Math.floor(Math.random() * arr.length)];
  return mxPick(k, pet);
};
const mxPick = (k, pet) => {
  const a = (pet && pet.lines && pet.lines[k]) || MX_LINES[k] || MX_LINES.idle;
  let s = a[Math.floor(Math.random() * a.length)];
  if (s === lastSaid[k]) s = a[Math.floor(Math.random() * a.length)];
  lastSaid[k] = s;
  return s;
};
const MX_NAME_KEY = 'alan-mx-name';
function mxGetName() { try { return localStorage.getItem(mxKey(MX_NAME_KEY)) || ''; } catch (e) { return ''; } }
function mxSetName(n) { try { localStorage.setItem(mxKey(MX_NAME_KEY), String(n || '').slice(0, 8)); } catch (e) {} }

/* v392（E）：「先去睡覺」以前只是一個 useState，重新整理就跑回來了——
   對想安靜的孩子等於這個功能不存在。存的值是「睡到哪一天」的 YYYY-MM-DD，
   寫法照抄上面的 mxGetHat/mxSetHat（含 try/catch），無痕模式讀寫失敗就當作沒設定。 */
const MX_OFF_KEY = 'alan-mx-off';   // 全站慣例前綴是 alan-*
function mxDay(plus) {              // 跟 app.jsx 同一套算法：new Date().toISOString().slice(0,10)
  try { return new Date(Date.now() + (plus || 0) * 86400000).toISOString().slice(0, 10); }
  catch (e) { return ''; }
}
function mxGetOff() { try { return localStorage.getItem(mxKey(MX_OFF_KEY)) || ''; } catch (e) { return ''; } }
function mxSetOff(d) { try { if (d) localStorage.setItem(mxKey(MX_OFF_KEY), d); else localStorage.removeItem(mxKey(MX_OFF_KEY)); } catch (e) {} }


/* 純走位／搞笑的動作（不含答題反應）——所有夥伴共用的底牌 */
const MX_ACTS = ['walk', 'walk', 'walk', 'jump', 'spin', 'dance', 'roll', 'peek', 'sleep', 'think'];

/* ══ v401：夥伴名冊 ══════════════════════════════════════════════════════
   acts ＝ 這一隻平常會做的事（權重就是「同一個動作寫幾次」，故意不用另一套資料結構）。
   sig  ＝ 招牌動作，只有牠會做；點牠的時候一定先做這一個（不然小朋友發現不了）。
   ⚠ 加新夥伴只要往這個陣列裡加一筆，MascotLayer 完全不用改。
   ⚠ 移動類的動作（走位）只有 walk / roll / dash 三種，寫在別的名字不會位移。
   speed ＝ 走位速度的倍率（v407）。Alan 回報「阿石沒有走很慢、小焰沒有跑很快」——
   原因是速度只看「動作」不看「是誰」：阿石的池子裡有兩個 roll（190px/s），
   比誰都快；小焰的 dash 是 300px/s，只有走路的 4.8 倍，在 1000px 寬的畫面上
   跑完要 3.3 秒，看起來就只是「走比較快」。個性要靠這個倍率才表現得出來。 */
const MX_MOVE_ACTS = ['walk', 'roll', 'dash'];
/* 每種走位的基礎速度（px / 秒），再乘上該夥伴的 speed。 */
const MX_BASE_SPEED = { walk: 62, roll: 190, dash: 620 };
/* 上面那些 px/秒 是以「桌機的身體大小」為準訂的；實際速度會照身體比例縮放（v414）。 */
const MX_REF_W = 50;
const MX_PETS = [
  {
    id: 'clay', speed: 1, zh: 'Claudius', tip: '陪你唸書的老夥伴',
    art: ClaudeMascot, sig: 'type', sigZh: '打電腦',
    acts: ['walk', 'walk', 'walk', 'jump', 'spin', 'dance', 'roll', 'peek', 'sleep', 'think', 'type', 'type'],
    lines: { idle: ['我在散步 🚶', '這裡風景不錯', '要不要摸摸我', '我在數格子 1、2、3…'],
             sig:  ['我在寫程式（假的）💻', '叩叩叩…好忙好忙', '我幫你把答案存起來了（沒有）'] },
  },
  {
    id: 'owl', speed: 0.85, zh: '咕咕', tip: '眼睛很大，想的比走的多',
    art: OwlMascot, sig: 'read', sigZh: '看書',
    acts: ['walk', 'walk', 'jump', 'peek', 'think', 'think', 'read', 'read', 'read', 'sleep', 'spin'],
    lines: { hello: ['咕…咕…📖', '我剛剛在看書', '嗨，一起唸書吧'],
             idle:  ['這一頁我看三遍了', '書裡面有答案喔', '咕咕。'],
             sig:   ['讀到好看的地方了 📖', '這句我記起來了', '再一頁就好…'] },
  },
  {
    id: 'flame', speed: 1.15, zh: '小焰', tip: '靜不下來，跑超快',
    art: FlameMascot, sig: 'dash', sigZh: '衝刺',
    acts: ['walk', 'walk', 'dash', 'dash', 'dash', 'jump', 'jump', 'spin', 'dance', 'roll', 'peek'],
    lines: { hello: ['咻——！🔥', '我來了我來了', '要比賽跑步嗎'],
             idle:  ['坐不住啦', '好想跑', '我很燙喔（其實不會）'],
             sig:   ['咻咻咻！🔥', '你追不到我～', '再一圈！'] },
  },
  {
    id: 'rock', speed: 0.38, zh: '阿石', tip: '慢吞吞，最愛裝石頭',
    art: RockMascot, sig: 'hide', sigZh: '裝石頭',
    /* v407：本來有兩個 roll。roll 的基礎速度是走路的 3 倍，所以「慢吞吞的阿石」
       實際上是全場移動最快的一隻——Alan 看到的就是這個。留一個 roll 當笑點就好。 */
    acts: ['roll', 'walk', 'walk', 'hide', 'hide', 'hide', 'sleep', 'sleep', 'think', 'peek', 'jump'],
    lines: { hello: ['……（是一顆石頭）', '嗨，我醒了', '慢慢來就好'],
             idle:  ['我在原地想事情', '好穩。', '滾一下比較快'],
             sig:   ['我是石頭。', '……（假裝沒看到）', '噓，別說出去'] },
  },
  {
    id: 'sprout', speed: 1, zh: '小芽', tip: '好奇寶寶，開心就會長高',
    art: SproutMascot, sig: 'grow', sigZh: '長高',
    acts: ['walk', 'walk', 'peek', 'peek', 'grow', 'grow', 'think', 'dance', 'sleep', 'jump'],
    lines: { hello: ['我今天又長高了 🌱', '嗨嗨！', '陽光好舒服'],
             idle:  ['再長一點點…', '你有澆水嗎', '葉子癢癢的'],
             sig:   ['長高了！🌱', '我又冒新葉子了', '再一公分就好'] },
  },
];
const MX_PET_KEY = 'alan-mx-pet';
function mxGetPet() {
  try {
    const id = localStorage.getItem(mxKey(MX_PET_KEY));
    return MX_PETS.some(p => p.id === id) ? id : MX_PETS[0].id;   // 認不得就回預設，不會變成空白
  } catch (e) { return MX_PETS[0].id; }
}
function mxSetPet(id) { try { localStorage.setItem(mxKey(MX_PET_KEY), id || ''); } catch (e) {} }
function mxPetOf(id) { return MX_PETS.find(p => p.id === id) || MX_PETS[0]; }

/* 招牌動作要停留多久（毫秒）。走位類的不在這裡，時間是照距離算的。 */
const MX_SIG_HOLD = { type: 2800, read: 3000, hide: 2600, grow: 2600 };

function MascotLayer() {
  const [alive,  setAlive]  = useFx(false);   // 進站 2.5 秒後才出來，不跟載入畫面搶
  /* v392（E）：長按＝去睡覺，而且「記得住」——初始值直接讀 localStorage 的到期日 */
  const [hidden, setHidden] = useFx(() => mxGetOff() >= mxDay(0));
  const [x,      setX]      = useFx(24);
  const [dir,    setDir]    = useFx(1);
  const [act,    setAct]    = useFx('idle');
  const [moveMs, setMoveMs] = useFx(0);
  const [bubble, setBubble] = useFx('');
  const [wear, setWear]   = useFx(() => (window.mxWearOf ? window.mxWearOf(window.__mxData) : { hat: '', item: '', fx: 'fx_confetti', voice: 'vo_default' }));
  const [stars, setStars] = useFx(0);           // v431: 現在有幾顆星星（app.jsx 算好放 window.__mxStars）
  const [dress, setDress] = useFx(false);       // v431: 裝扮室
  const [dressTab, setDressTab] = useFx('hat');
  const [name, setName]   = useFx(mxGetName());
  const [petId, setPetId] = useFx(mxGetPet);     // v401: 現在陪你的是哪一隻
  const [menu, setMenu]   = useFx(false);        // 長按叫出來的小選單
  const [petPick, setPetPick] = useFx(false);    // v401: 夥伴圖鑑（從小選單打開）
  const [drag, setDrag]   = useFx(null);         // 拖著走時的 {x,y}
  const timers  = useFxR([]);
  const bubbleT = useFxR(null);
  const reduce  = useFxR(false);
  const runRef     = useFxR(0);       // v392（B）：目前連對幾題（答錯歸零）
  const greetedRef = useFxR(false);   // v392（C）：一個 session 只打一次招呼

  /* v392（F-4）：bubbleT 以前沒被登記進 timers，元件卸載／effect 重建時不會被清；
     順手把還掛著的泡泡收掉——進到作答畫面時泡泡就該立刻消失。 */
  const clearAll = () => {
    timers.current.forEach(clearTimeout); timers.current = [];
    if (bubbleT.current) { clearTimeout(bubbleT.current); bubbleT.current = null; }
    setBubble('');
  };
  /* v392（F-3）：跑完就把自己從 timers 移除。實測掛著 60 分鐘會累積約 1292 筆
     早就跑完的 timeout id，陣列只進不出。 */
  const later = (fn, ms) => {
    const t = setTimeout(() => {
      timers.current = timers.current.filter(x => x !== t);
      fn();
    }, ms);
    timers.current.push(t);
    return t;
  };

  const pet = mxPetOf(petId);
  const Art = pet.art;
  /* window.mascotCheer 與攔 playSound 的那兩個 effect 不會因為換夥伴而重建
     （deps 沒有 petId），直接引用 pet 會抓到換之前的舊值 → 用 ref 帶著走。 */
  const petRef = useFxR(pet);
  useFxE(() => { petRef.current = pet; }, [petId]);
  /* 跟 petRef 一樣的理由：掛 window.mascotCheer／攔 playSound 的那兩個 effect
     不會因為換裝而重建，直接引用 wear 會抓到換裝之前的舊值。 */
  const wearRef = useFxR(wear);
  useFxE(() => { wearRef.current = wear; }, [wear]);

  const say = (text, ms) => {
    setBubble(text);
    if (bubbleT.current) clearTimeout(bubbleT.current);
    bubbleT.current = setTimeout(() => setBubble(''), ms || 2400);
  };

  /* app.jsx 會把 window.__mxAllow 設成「有沒有登入」——沒登入（門口／登入頁）就不出來。
     沒有這個旗標時（例如測試頁）預設出來。
     （v376 的「小螢幕才讓開、大螢幕照常玩」已被下面的 v392 取代。） */
  /* v392（A）：舊版靠 9 個 class 的白名單判斷「正在作答」，但 components-quiz-mode.jsx
     有 16 個 Player，只有 6 個命中；而且 window.innerWidth >= 900 直接跳過整個檢查，
     iPad 橫式 1180px 與桌機是「完全不受限制」——實測牠正在動的時間佔 48.9%、
     泡泡 4.5 次/分鐘，而 .mx-layer 的 z-index:60 高於內容、.qm-player-shell 只有
     max-width:860px 置中，牠走路時就從答案區前面經過。
     白名單維護不動就會漏，改用一個已經精準存在的訊號：components-quiz-mode.jsx 的
     {selectedItem && !editMode && <window.FocusBtn/>}——.focus-btn 這個節點存在，
     定義上就等於「學生正在做某一個練習、而且不是編輯模式」，一次涵蓋全部 16 個 Player。
     （.mk-* 是錯題本重練，本來也漏掉了。這裡只「讀」節點存不存在，不碰專心模式本身。） */
  const okNow = () => {
    if (window.__mxAllow === false) return false;
    if (document.hidden) return false;                       // v392（F-1）：切到別的分頁就停
    return !document.querySelector('.focus-btn, .mk-drill-options, .mk-overlay');
  };
  /* v392（A）：⚠「安靜」跟「消失」是兩件事——消失／出現本身就是會被眼角捕捉到的變化。
     canShow() 才決定牠在不在（沒登入／分頁切走＝真的不用畫），
     okNow() 只決定牠能不能動；作答時牠原地站著呼吸（mxBreathe 位移只有 0.6px）。 */
  const canShow = () => window.__mxAllow !== false && !document.hidden;
  const [allowed, setAllowed] = useFx(okNow());
  const [shown,   setShown]   = useFx(canShow());
  const [owned, setOwned] = useFx([]);
  /* v431：剛買下去的那幾件先記在這裡——Firestore 的快照要一下下才回來，
     這段期間畫面就已經是「買到了」，不會閃一下又變回價錢。 */
  const pendRef = useFxR([]);
  useFxE(() => {
    const sync = () => {
      /* v392（G）：每次都回傳新陣列，setState 的參考永遠不同 → 會保證每次都重繪。
         先比對再 setState（買了東西仍會在 1.5 秒內看到，只是不再無謂重繪）。 */
      const mx = window.__mxData || {};
      const srv = window.mxOwnedList ? window.mxOwnedList(mx) : [];
      pendRef.current = pendRef.current.filter(id => srv.indexOf(id) < 0);
      const own = srv.concat(pendRef.current);
      setOwned(prev => (prev.join() === own.join() ? prev : own));
      const w = window.mxWearOf ? window.mxWearOf(mx) : { hat: '', item: '', fx: 'fx_confetti', voice: 'vo_default' };
      /* v385 買過帽子、但還沒進過裝扮室的人：照舊自動幫他戴上（不然會覺得帽子不見了） */
      if (!w.hat) {
        const legacy = mxOwnedHats(), want = mxGetHat();
        w.hat = (legacy.indexOf(want) >= 0 ? want : legacy[0]) || '';
        if (w.hat === 'party') w.hat = 'hat_party';
        if (w.hat === 'crown') w.hat = 'hat_crown';
      }
      setWear(prev => ((prev.hat === w.hat && prev.item === w.item && prev.fx === w.fx && prev.voice === w.voice) ? prev : w));
      setStars(prev => (prev === (window.__mxStars || 0) ? prev : (window.__mxStars || 0)));
    };
    sync();
    const iv = setInterval(sync, 1500);
    return () => clearInterval(iv);
  }, []);

  /* ── v431 裝扮室：買／穿／表演 ────────────────────────────────
     買賣真正寫進 Firestore 的是 app.jsx 掛上來的 window.__mxBuy／__mxWear
     （那裡才有 user.uid 與「現在有幾顆星星」）。這裡只負責畫面與說話。 */
  const MX_DANCE_ACT = { dc_wave: ['wave', 1500], dc_spin: ['spin', 1000], dc_dance: ['dance', 2600], dc_flip: ['flip', 1000], dc_moon: ['moon', 2600] };
  const hasItem = (id) => (window.mxHasItem ? window.mxHasItem({ owned }, id) : false);
  const myDances = (window.MX_SHOP || []).filter(it => it.kind === 'dance' && hasItem(it.id));
  const playDance = (id) => {
    const d = MX_DANCE_ACT[id] || ['dance', 2000];
    if (reduce.current) { say('動畫關起來了，我先不動 🙂', 2400); return; }
    setAct(d[0]); later(() => setAct('idle'), d[1]);
    if (window.playSound) window.playSound('pop');
  };
  const pickItem = async (it) => {
    // 已經有了 → 穿上／脫下（動作類就是表演一次）
    if (hasItem(it.id)) {
      if (it.kind === 'dance') { setDress(false); playDance(it.id); return; }
      const off = wear[it.kind] === it.id;
      // 特效與語音一定要留一個（預設那個是免費的），不然答對就沒有反應了
      const next = off ? (it.kind === 'fx' ? 'fx_confetti' : it.kind === 'voice' ? 'vo_default' : '') : it.id;
      setWear(prev => Object.assign({}, prev, { [it.kind]: next }));
      const r = await (window.__mxWear ? window.__mxWear(it.kind, next) : Promise.resolve({ ok: false, reason: 'no-user' }));
      if (!r.ok && r.reason === 'no-user') { say('登入以後才存得起來喔', 2600); return; }
      say(off ? '先收起來' : `${it.zh}，好看嗎？`, 2200);
      return;
    }
    // 還沒有 → 用星星買
    if (stars < (it.cost || 0)) { say(`還差 ${((it.cost || 0) - stars).toLocaleString()} 顆星星 ⭐`, 2800); return; }
    if (!window.confirm(`要用 ${it.cost.toLocaleString()} 顆星星買「${it.zh}」嗎？`)) return;
    const r = await (window.__mxBuy ? window.__mxBuy(it.id) : Promise.resolve({ ok: false, reason: 'no-user' }));
    if (!r.ok) {
      say(r.reason === 'no-user' ? '要先登入才能買喔' :
          r.reason === 'poor'    ? `還差 ${(r.short || 0).toLocaleString()} 顆星星` :
                                   '沒買成功，等一下再試一次', 3000);
      return;
    }
    pendRef.current = pendRef.current.concat([it.id]);
    setOwned(prev => prev.concat([it.id]));
    setStars(prev => Math.max(0, prev - (it.cost || 0)));
    if (window.playSound) window.playSound('pop');
    if (it.kind === 'dance') { say(`學會${it.zh}了！`, 2600); setDress(false); playDance(it.id); return; }
    setWear(prev => Object.assign({}, prev, { [it.kind]: it.id }));
    if (window.__mxWear) window.__mxWear(it.kind, it.id);
    say(`買到${it.zh}了！`, 2800);
  };

  /* v404：登入／換帳號時，把「這個帳號自己的」設定重讀一次。
     ⚠ 這幾個 useState 的初始值是在 mount 當下算的，那時 Firebase 還沒解析完、
       window._currentUser 還是 null ＝ 讀到的是訪客那一份。不補這一段的話，
       登入後看到的仍然是訪客的夥伴／名字／休息狀態。
     ⚠ 掛在本來就有的每秒 tick 上，不另外開 timer。 */
  /* 初值刻意用 null（不是 mxUid()）：頁面載入時帳號可能「已經」解析好了，
     若初值就等於當下的 uid，下面的 syncAccount 會判定「沒變」→ 一次性搬家永遠不會跑。
     用 null 保證第一次一定會執行一遍（重讀同樣的值是無害的）。 */
  const uidRef = useFxR(null);
  useFxE(() => {
    /* v414：「減少動態」本來只在掛載時讀一次，之後改設定要重新整理才算數
       （iPad 的輔助使用很容易被開開關關）。改成掛監聽＋每秒的 tick 也順手重讀，
       開了就立刻安靜、關了就立刻活過來。 */
    let mq = null;
    const readReduce = () => {
      try {
        if (!mq) mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        reduce.current = mq.matches;
      } catch (e) {}
    };
    readReduce();
    if (mq && mq.addEventListener) mq.addEventListener('change', readReduce);
    const t = setTimeout(() => setAlive(true), 2500);
    const syncAccount = () => {
      const u = mxUid();
      if (u === uidRef.current) return;
      uidRef.current = u;
      mxMigrateOnce();                       // 舊的公用設定搬給第一個登入的帳號（只做一次）
      setHidden(mxGetOff() >= mxDay(0));
      setName(mxGetName());
      setPetId(mxGetPet());
      // 帽子有自己的 4 秒同步（要跟星星商店對帳），這裡不重複處理
    };
    syncAccount();
    const tick = () => { readReduce(); syncAccount(); setAllowed(okNow()); setShown(canShow()); };
    const iv = setInterval(tick, 1000);
    /* v392（F-2）：切回分頁時立刻同步，不然要等最多 1 秒才醒過來 */
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearTimeout(t); clearInterval(iv);
      document.removeEventListener('visibilitychange', tick);
      if (mq && mq.removeEventListener) mq.removeEventListener('change', readReduce);
    };
  }, []);

  /* v392（A）：走到一半才進作答畫面怎麼辦？
     走路是 CSS transition（最長可到十幾秒），清掉 timer 也停不下來——牠會繼續
     從答案區前面滑過去。這裡讀當下真正的 transform 把牠「凍在原地」：
     先 setMoveMs(0) 拿掉 transition、再把 x 設成目前的位置，同一批 render，
     所以不會瞬移回原本的目標點。moveMs 是 0（沒在走）時完全不做事。 */
  const slotRef = useFxR(null);
  useFxE(() => {
    if (allowed) return;
    /* 立刻安靜下來——不要等下一輪 doAct（effect 重建後最久會拖到 2.3 秒，
       實測就是這樣讓一段 sleep／dance 拖進作答畫面）。
       nod／cheer／land 是「剛剛才發生的正向回饋」，不砍。 */
    setAct(a => (a === 'nod' || a === 'cheer' || a === 'land') ? a : 'idle');
    if (!moveMs) return;
    const el = slotRef.current;
    if (!el) return;
    let cur = null;
    try { cur = new DOMMatrixReadOnly(getComputedStyle(el).transform).m41; } catch (e) {}
    setMoveMs(0);
    if (cur != null && isFinite(cur)) setX(Math.round(cur));
  }, [allowed, moveMs]);

  /* 隨機動作循環 */
  useFxE(() => {
    if (!alive || hidden || !shown) return;
    let stopped = false;

    // 右下角有「浮動頭像」等固定元件，留白不要走過去
    const maxX = () => Math.max(20, (window.innerWidth || 360) - 130);
    /* 身體現在多寬（＝ --mx-w 解析後的值）。
       ⚠ 不要用 getComputedStyle 讀 --mx-w：自訂屬性回的是沒算過的 "clamp(...)" 字串。
       直接量 .mx-body 的版面寬度最準（transform 不影響 offsetWidth）。 */
    const petW = () => (bodyRef.current && bodyRef.current.offsetWidth) || MX_REF_W;

    const doAct = () => {
      if (stopped) return;
      /* v392（A）：安靜模式——不走、不跳、不說話，就原地站著呼吸。
         3 秒後再檢查一次（allowed 變 true 時 effect 也會自己重建）。
         ⚠ 這裡再直接問一次 okNow()：allowed 是每秒輪詢來的，最多會慢 1 秒，
         實測就是在那 1 秒的縫隙裡漏出一個 jump。動作只有幾秒一次，
         多跑一個 querySelector 的成本遠低於「作答時牠又跳了」。
         用 functional setAct 是為了不要把「連對 5 題的點頭」或「做完的大慶祝」蓋掉。 */
      if (!allowed || !okNow()) {
        setAct(a => (a === 'nod' || a === 'cheer' || a === 'land') ? a : 'idle');
        later(doAct, 3000);
        return;
      }
      /* v401：動作池改成「這一隻自己的」——每隻夥伴的個性就是靠這個池子的比重表現的
         （阿石大量 hide/sleep、小焰大量 dash、咕咕大量 read/think）。 */
      const pool = pet.acts && pet.acts.length ? pet.acts : MX_ACTS;
      const pick = reduce.current
        ? (Math.random() < 0.5 ? 'think' : 'sleep')            // 減少動態＝只做原地的小動作
        : pool[Math.floor(Math.random() * pool.length)];

      if (MX_MOVE_ACTS.indexOf(pick) >= 0) {
        const W = maxX();
        /* v407：衝刺一定跑「離自己最遠的那一端」。原本落點是隨機的，
           一半以上的衝刺只跑不到畫面的 1/3，再快也看不出來是在衝——
           小朋友看到的是「牠走得比較急」，不是「牠跑很快」。 */
        const target = pick === 'dash' ? (x > W / 2 ? 0 : W) : Math.round(Math.random() * W);
        const dist   = Math.abs(target - x);
        if (dist < 30) { setAct('idle'); later(doAct, 1200); return; }
        /* v407: 速度＝這個動作的基礎速度 × 這一隻的倍率（阿石 0.38、小焰 1.15）
           v414（Alan：「平板的動畫跟電腦不太一樣」）：再乘上「身體有多大」。
           基礎速度是絕對 px/秒，但身體會跟著畫面縮（--mx-w：桌機 50px、平板直式 38px），
           所以在平板上牠等於用「每秒 16 個身長」在跑、桌機只有 12 個——同一隻卻更毛躁。
           改成用身長計速，不管什麼裝置看起來都是同一個角色。 */
        const speed  = (MX_BASE_SPEED[pick] || 62) * (pet.speed || 1) * (petW() / MX_REF_W);
        const ms     = Math.max(200, Math.round(dist / speed * 1000));
        setDir(target > x ? 1 : -1);
        setMoveMs(ms);
        setX(target);
        setAct(pick);
        if (Math.random() < 0.08) say(mxLine(pick === pet.sig ? 'sig' : 'idle', pet, wearRef.current.voice));   // v392（D）：0.25 → 0.08
        /* v407：衝刺改成「衝到底 → 煞車 → 再衝回來」。
           速度是比較出來的：中間那 0.36 秒的煞車停格就是參考點，
           有它才看得出牠剛剛橫越了整個畫面，沒有它只是一路滑過去。 */
        if (pick === 'dash') {
          const back = target === 0 ? W : 0;
          const ms2  = Math.max(200, Math.round(Math.abs(back - target) / speed * 1000));
          later(() => {
            setMoveMs(0); setAct('skid');                       // 煞車：原地滑一下、腳往前撐
            later(() => {
              setDir(back > target ? 1 : -1);
              setMoveMs(ms2); setX(back); setAct('dash');
              later(() => { setAct('idle'); setMoveMs(0); later(doAct, 900 + Math.random() * 2200); }, ms2 + 120);
            }, 360);
          }, ms + 60);
          return;
        }
        later(() => { setAct('idle'); setMoveMs(0); later(doAct, 900 + Math.random() * 2200); }, ms + 120);
        return;
      }

      const HOLD = Object.assign({ jump: 1000, spin: 950, dance: 2000, peek: 1700, sleep: 4200, think: 2200 }, MX_SIG_HOLD);
      setAct(pick);
      /* v392（D）：泡泡是文字（font-weight:700、最寬 190px），比動作更會搶走視線。
         實測 1180px 是 4.50 泡泡/分鐘、390px 是 6.01 → 出現率腰斬。
         睡覺以前是「無條件講一句」，也改成一半機率。 */
      if (pick === 'sleep') { if (Math.random() < 0.5) say(mxLine('sleep', pet, wearRef.current.voice), 3800); }
      /* v401：招牌動作的泡泡機率拉高到 40%——它一個 session 才出現幾次，
         而且「牠在做什麼」要靠這句話才看得懂（打電腦、看書、裝石頭）。
         其他動作維持 v392 調低後的 15%，整體泡泡量不會回到當初被嫌吵的程度。 */
      else if (pick === pet.sig) { if (Math.random() < 0.4) say(mxLine('sig', pet, wearRef.current.voice)); }
      else if (Math.random() < 0.15) say(mxLine('idle', pet, wearRef.current.voice));   // v392（D）：0.45 → 0.15
      later(() => { setAct('idle'); later(doAct, 1200 + Math.random() * 3000); }, HOLD[pick] || 1200);
    };

    /* v392（C）：這個 effect 的 deps 有 allowed，而 allowed 會隨「進入／離開作答畫面」
       來回切換——以前每重跑一次就再說一次 hello，學生做完一個練習回到清單，
       700ms 後就被重新打招呼。A 做完之後切換更頻繁，所以這條必須跟 A 一起做。 */
    const first = later(() => {
      if (!greetedRef.current) { greetedRef.current = true; say(mxLine('hello', pet, wearRef.current.voice)); }
      later(doAct, 1600);
    }, 700);
    return () => { stopped = true; clearTimeout(first); clearAll(); };
    /* v401：deps 一定要帶 petId——換夥伴時這個 effect 不重建的話，doAct 的閉包
       抓到的還是「上一隻」的動作池與台詞。實測：從小焰換成咕咕之後，
       咕咕還在做 roll（翻滾是小焰池子裡的，咕咕沒有）。 */
  }, [alive, hidden, shown, allowed, petId]);

  /* 答題反應——攔 playSound，全站不用改任何一行就有反應 */
  useFxE(() => {
    if (!alive || hidden || !shown) return;   // ⚠ 不看 allowed：答題本來就發生在作答畫面裡
    const orig = window.playSound;
    if (!orig || orig.__mx) return;
    /* v392（B）：以前是每一題擲一次骰子（對 45% 跳＋泡泡、錯 45% 抖＋泡泡）。
       跑 200000 次模擬（20 題、正確率 80%）：平均每份被打斷 9.0 次，
       等於每 2.2 題就跳一次。答錯那條特別該拿掉——小朋友答錯的當下
       最不需要旁邊有東西抖一下。改成「連對 5 題」才回應一次，
       而且反應降級成 3px 的點頭（不是位移 13px 的 jump），也不出泡泡。
       同樣條件下打斷次數 9.0 → 1.7 次/份，而且每一次都真的代表「你連對 5 題」。
       runRef 是 useRef，effect 因 allowed/shown 變動重建時不會被重置，行為正確。 */
    const patched = function (type) {
      try { orig.apply(this, arguments); } catch (e) {}
      try {
        if (type === 'correct') {
          runRef.current++;
          if (runRef.current % 5 === 0) { setAct('nod'); later(() => setAct('idle'), 620); }
        }
        else if (type === 'wrong') { runRef.current = 0; }   // 答錯＝連勝歸零，完全不反應
        else if (type === 'complete' || type === 'fanfare') {
          // 做完了本來就該有大慶祝——這條維持不動
          setAct('cheer'); say(mxLine('win', petRef.current, wearRef.current.voice), 3000); later(() => setAct('idle'), 2200);
        }
      } catch (e) {}
    };
    patched.__mx = true;
    window.playSound = patched;
    return () => { if (window.playSound === patched) window.playSound = orig; };
  }, [alive, hidden, shown]);

  /* 給外面用的小 API */
  useFxE(() => {
    /* v431：商店（StarsPanel）按「去裝扮室」會叫這個；牠在睡覺就順便叫醒 */
    window.mxOpenDress = () => { mxSetOff(''); setHidden(false); setDress(true); };
    window.mascotSay = (t) => say(String(t || ''), 2600);
    window.mascotDo  = (a) => { setAct(a); later(() => setAct('idle'), 1600); };
    window.mascotCheer = () => { setAct('cheer'); say(mxLine('win', petRef.current, wearRef.current.voice), 3000); later(() => setAct('idle'), 2200); };
  }, []);

  /* 點一下＝耍寶；長按＝去睡覺（這次不再出現）。
     ⚠ 牠會走到按鈕上面——所以點到牠的時候，先看看牠腳下是不是按鈕：
     是的話就把這一下讓給按鈕（吉祥物絕不會吃掉小朋友的作答）。 */
  const pressT = useFxR(null);
  const longRef = useFxR(false);
  const bodyRef = useFxR(null);
  const startRef = useFxR(null);
  const movedRef = useFxR(false);
  const pressedRef = useFxR(false);      // ⚠ 一定要有：不然放開之後滑鼠只是「移過去」也會被當成拖曳
  const onDown = (e) => {
    longRef.current = false; movedRef.current = false; pressedRef.current = true;
    startRef.current = { x: e.clientX, y: e.clientY };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
    // 長按＝叫出小選單（取名字／去睡覺）
    pressT.current = setTimeout(() => { if (!movedRef.current) { longRef.current = true; setMenu(true); } }, 650);
  };
  /* v384: 拖著走。小朋友最愛的就是這個，而且完全不吵——放開會掉回地上彈一下。 */
  const onMove = (e) => {
    if (!pressedRef.current || !startRef.current) return;   // 沒按著就不理它
    const dx = e.clientX - startRef.current.x, dy = e.clientY - startRef.current.y;
    if (!movedRef.current && Math.abs(dx) + Math.abs(dy) < 8) return;
    movedRef.current = true;
    clearTimeout(pressT.current);
    setDrag({ x: e.clientX, y: e.clientY });
  };
  const endDrag = () => {
    pressedRef.current = false;
    startRef.current = null;
    if (!movedRef.current) return;
    const d = drag;
    setDrag(null);
    if (d) {
      const maxX = Math.max(20, (window.innerWidth || 360) - 130);
      setX(Math.max(0, Math.min(maxX, Math.round(d.x - 23))));
      setMoveMs(0);
    }
    setAct('land'); later(() => setAct('idle'), 620);
    if (window.playSound) window.playSound('pop');
  };
  const onUp = (e) => {
    clearTimeout(pressT.current);
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (err) {}
    const wasDrag = movedRef.current;
    pressedRef.current = false; startRef.current = null;
    if (wasDrag) { endDrag(); return; }
    if (longRef.current) return;
    const el = bodyRef.current;
    if (el && e && e.clientX != null) {
      const prev = el.style.pointerEvents;
      el.style.pointerEvents = 'none';
      const under = document.elementFromPoint(e.clientX, e.clientY);
      el.style.pointerEvents = prev;
      const hit = under && under.closest && under.closest('button, a, input, select, textarea, label, [role="button"]');
      if (hit) { hit.click(); return; }     // 腳下是按鈕 → 這一下算按鈕的，不耍寶
    }
    /* v401：點一下有 45% 直接做招牌動作。招牌動作在自動循環裡幾分鐘才輪到一次，
       小朋友不會等那麼久——「點牠就會表演」才是他們發現這件事的方式。
       ⚠ 走位類的招牌（小焰的 dash）不能在這裡做：這裡不設定 moveMs/x，
         套上去只會原地抽動，所以那一隻退回一般把戲。 */
    const sigOk = !reduce.current && pet.sig && MX_MOVE_ACTS.indexOf(pet.sig) < 0;
    if (sigOk && Math.random() < 0.45) {
      setAct(pet.sig); say(mxLine('sig', pet, wearRef.current.voice), 2400);
      if (window.playSound) window.playSound('match');
      later(() => setAct('idle'), MX_SIG_HOLD[pet.sig] || 1600);
      return;
    }
    const tricks = reduce.current ? ['think'] : ['jump', 'spin', 'dance', 'roll'];
    const t = tricks[Math.floor(Math.random() * tricks.length)];
    setAct(t); say(mxLine('tap', pet, wearRef.current.voice), 2000);
    if (window.playSound) window.playSound('match');
    later(() => setAct('idle'), t === 'dance' ? 2000 : 1000);
  };

  /* v392（A）：作答時不再整隻消失（那本身就是一個變化），只是安靜下來；
     真正不畫的只有「沒登入」與「分頁切走」——後者順便讓 CSS 無限循環動畫全停。 */
  if (!alive || !shown) return null;

  /* v404（Alan：「不小心按到休息一天，就沒辦法叫回來了」）：
     休息中不再是「整隻消失」——那等於把唯一的入口（長按牠）一起弄不見，
     只能等到隔天或自己去清 localStorage。
     改成留一顆很安靜的 💤 小鈕在原地：不會走動、不說話、透明度只有 0.45
     （「安靜」的目的完全保留），但點一下就能把夥伴叫回來。 */
  if (hidden) {
    return (
      <div className="mx-layer">
        <button className="mx-wake" title="把夥伴叫回來" aria-label="把夥伴叫回來"
          onClick={() => {
            mxSetOff('');                 // 清掉「休息到哪一天」
            setHidden(false);
            greetedRef.current = false;   // 讓牠回來時重新打一次招呼
            if (window.playSound) window.playSound('pop');
          }}>💤</button>
      </div>
    );
  }

  const slotStyle = drag
    ? { transform: 'none', transition: 'none', left: (drag.x - 23) + 'px', bottom: 'auto',
        top: (drag.y - 20) + 'px', position: 'fixed' }
    : { transform: `translateX(${x}px)`, transition: moveMs ? `transform ${moveMs}ms linear` : 'none' };

  return (
    <div className={'mx-layer' + (drag ? ' dragging' : '')}>
      <div ref={slotRef} className="mx-slot" style={slotStyle}>
        {/* v408（Alan：「小芽長高的時候葉子會被他講話給遮住，沒看到」）：
            泡泡是釘在「沒有變形之前」的頭頂上——.mx-slot 的高度不會因為 scaleY 變高，
            所以小芽一抽高，頭跟葉子就鑽到泡泡底下去了。
            ⚠ 只有長高這個動作會把身體變高，所以只有它需要讓位。 */}
        {bubble && !menu && !petPick &&
          <div className={'mx-bubble' + (act === 'grow' ? ' mx-bubble-high' : '')}>{bubble}</div>}
        {/* v407：多一個 pet-<id>——同一個動作要能「這一隻做得不一樣」
            （阿石滾得慢、走得重；小焰衝刺時身後有速度線）。 */}
        <div ref={bodyRef} className={'mx-body pet-' + petId + ' act-' + act} style={{ '--mx-dir': dir }}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}
          onPointerCancel={() => { clearTimeout(pressT.current); endDrag(); }}
          role="img" aria-label={`吉祥物 ${name || pet.zh}`}>
          <Art hat={wear.hat || 'none'}/>
          {/* v431：買來的配件疊在身上（同一個 viewBox，五隻夥伴都對得準） */}
          <MxAcc id={wear.item}/>
          {/* v407：衝刺的速度線。放在 .mx-body 裡面所以會跟著 scaleX(dir) 一起翻面，
              永遠留在「牠的身後」，不用另外算方向。 */}
          <span className="mx-trail" aria-hidden="true"><i/><i/><i/></span>
        </div>
      </div>
      {/* v401：選單與圖鑑改掛在 .mx-layer 底下（不再是 .mx-slot 的小孩）。
          .mx-slot 會跟著吉祥物左右移動，選單本來是「以牠為中心」展開的——
          牠走到最左邊時，230px 寬的圖鑑會有 75px 掉到畫面外（實測 375px 手機：left = -75）。
          掛在滿版的 .mx-layer 上、水平置中，不管牠站在哪裡都完整看得到。 */}
        {menu && (
          <div className="mx-menu" onPointerDown={e => e.stopPropagation()}>
            <div className="mx-menu-name">{name || '還沒有名字'}</div>
            <button onClick={() => {
              const n = window.prompt('幫牠取個名字（最多 8 個字）', name || '');
              if (n !== null) { mxSetName(n.trim()); setName(n.trim()); say(n.trim() ? `我叫 ${n.trim()}！` : '好吧，我沒有名字', 2600); }
              setMenu(false);
            }}>✏️ 取名字</button>
            {/* v431（Alan：「長按吉祥物可以直接購買和換裝」）：帽子／配件／特效／語音／動作都在這裡 */}
            <button onClick={() => { setMenu(false); setDress(true); }}>👕 裝扮室</button>
            {myDances.length > 0 && (
              <button onClick={() => { setMenu(false); playDance(myDances[Math.floor(Math.random() * myDances.length)].id); }}>
                💃 表演一個
              </button>
            )}
            {/* v401：換夥伴——名冊做成一張小圖鑑，點頭像就換 */}
            <button onClick={() => { setMenu(false); setPetPick(true); }}>🐾 換夥伴</button>
            {/* v392（E）：以前叫「先去睡覺」，但重新整理就跑回來了，文案跟行為對不上。
                現在存「睡到哪一天」，文案也改成看得懂的樣子。 */}
            {/* v404：文案補上「隨時叫得回來」——按之前就知道這件事不是不可逆的 */}
            <button onClick={() => { setMenu(false); mxSetOff(mxDay(0)); setHidden(true); }}>💤 休息一下（今天）</button>
            <button onClick={() => { setMenu(false); mxSetOff(mxDay(1)); setHidden(true); }}>😴 明天也不要</button>
            <div className="mx-menu-hint">睡著後點角落的 💤 就能叫回來</div>
            <button className="mx-menu-x" onClick={() => setMenu(false)}>取消</button>
          </div>
        )}
        {dress && (
          <div className="mx-dress"
            /* ⚠ style 也寫一次 pointerEvents：.mx-layer 是 pointer-events:none，
               萬一 CSS 是舊的（Service Worker 快取），按不到會是致命的——寫在 JSX 上就不會漏 */
            style={{ pointerEvents: 'auto' }} onPointerDown={e => e.stopPropagation()}>
            <div className="mx-dress-head">
              <b>👕 裝扮室</b>
              <span className="mx-dress-bal">{stars.toLocaleString()} ⭐</span>
              <button className="mx-dress-x" onClick={() => setDress(false)} aria-label="關起來">✕</button>
            </div>
            {/* 預覽：現在這一隻穿好的樣子，點一下就表演 */}
            <div className="mx-dress-prev" onClick={() => myDances.length && playDance(myDances[0].id)}>
              <span className="mx-dress-figure"><Art size={62} hat={wear.hat || 'none'}/><MxAcc id={wear.item}/></span>
              <span className="mx-dress-who">{name || pet.zh}</span>
            </div>
            <div className="mx-dress-tabs">
              {(window.MX_KINDS || []).map(k => (
                <button key={k.kind} className={dressTab === k.kind ? 'on' : ''}
                  onClick={() => setDressTab(k.kind)}>{k.ico} {k.zh}</button>
              ))}
            </div>
            <div className="mx-dress-grid">
              {(window.MX_SHOP || []).filter(it => it.kind === dressTab).map(it => {
                const have = hasItem(it.id);
                const on   = have && (it.kind === 'dance' ? false : wear[it.kind] === it.id);
                return (
                  <button key={it.id} className={'mx-dz' + (have ? ' have' : '') + (on ? ' on' : '')}
                    onClick={() => pickItem(it)}>
                    <span className="mx-dz-ico">{it.emoji}</span>
                    <span className="mx-dz-name">{it.zh}</span>
                    <span className="mx-dz-tag">
                      {!have ? `${it.cost.toLocaleString()}⭐`
                        : it.kind === 'dance' ? '表演'
                        : on ? '穿著中' : '穿上'}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mx-dress-note">
              {dressTab === 'fx' ? '答對題目的時候會放這個特效 ✨'
                : dressTab === 'voice' ? '牠講話的口氣會變成這一種 🔊'
                : dressTab === 'dance' ? '買了之後，長按牠就可以叫牠表演 💃'
                : '星星是做練習賺來的；買了以後隨時可以換 · 再按一次可以脫下來'}
            </div>
            <button className="mx-menu-x" onClick={() => setDress(false)}>關起來</button>
          </div>
        )}
        {petPick && (
          <div className="mx-pets" onPointerDown={e => e.stopPropagation()}>
            <div className="mx-menu-name">選一個夥伴陪你</div>
            {MX_PETS.map(p => {
              const PArt = p.art;
              return (
                <button key={p.id} className={'mx-pet-row' + (p.id === petId ? ' on' : '')}
                  onClick={() => {
                    mxSetPet(p.id); setPetId(p.id); setPetPick(false);
                    setAct('idle');
                    /* 換完立刻打一次招呼＋做一次招牌動作，小朋友才知道換成功了、
                       也順便看到這一隻會什麼。走位類的招牌一樣不能在這裡放（見上面）。 */
                    say(mxPick('hello', p), 2600);
                    if (MX_MOVE_ACTS.indexOf(p.sig) < 0 && !reduce.current) {
                      later(() => { setAct(p.sig); later(() => setAct('idle'), MX_SIG_HOLD[p.sig] || 1600); }, 700);
                    }
                    if (window.playSound) window.playSound('pop');
                  }}>
                  <span className="mx-pet-ico"><PArt size={30}/></span>
                  <span className="mx-pet-txt">
                    <b>{p.zh}{p.id === petId && <em> · 現在</em>}</b>
                    <span>{p.tip} · 會{p.sigZh}</span>
                  </span>
                </button>
              );
            })}
            <button className="mx-menu-x" onClick={() => setPetPick(false)}>關起來</button>
          </div>
        )}
    </div>
  );
}

/* ── 彩帶 ─────────────────────────────────────────────────── */
const FX_COLORS = ['#C1785A', '#C9A84C', '#2E7D5B', '#2E6F9E', '#8A5FA8', '#D6533C', '#E8C86A'];

/* v431：買了特效就換掉答對時灑下來的東西（預設仍然是彩帶）。
   一律用同一支 fxFall 動畫，只是把「紙片」換成字——不用另外寫動畫，也不會變慢。 */
const FX_CHARS = {
  fx_stars:  ['⭐', '✨', '🌟'],
  fx_hearts: ['💗', '💖', '❤️'],
  fx_bubble: ['🫧', '◦', '○'],
  fx_fire:   ['🎆', '🎇', '✨'],
};
function ConfettiBurst({ big, onDone }) {
  const chars = useFxR(FX_CHARS[(window.mxWearOf ? window.mxWearOf(window.__mxData).fx : '')] || null).current;
  const pieces = useFxR(
    Array.from({ length: big ? 84 : 26 }, (_, i) => ({   // 沒達標時只放一點點（是「你做完了」不是「你贏了」）
      id: i,
      left:  Math.random() * 100,
      color: FX_COLORS[Math.floor(Math.random() * FX_COLORS.length)],
      delay: Math.round(Math.random() * 420),
      dur:   Math.round(1500 + Math.random() * 1400),
      w:     Math.round(6 + Math.random() * 6),
      h:     Math.round(9 + Math.random() * 9),
      spin:  Math.round((Math.random() - 0.5) * 900),
      drift: Math.round((Math.random() - 0.5) * 180),
      round: Math.random() < 0.3,
      ch: chars ? chars[Math.floor(Math.random() * chars.length)] : null,
    }))
  ).current;

  useFxE(() => {
    const t = setTimeout(() => onDone && onDone(), big ? 3400 : 2800);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="fx-confetti" aria-hidden="true">
      {pieces.map(p => (
        <span key={p.id} className={'fx-cfp' + (p.ch ? ' fx-cfp-ch' : '')}
          style={{
            left: p.left + '%', background: p.ch ? 'none' : p.color,
            width: p.ch ? 'auto' : p.w + 'px', height: p.ch ? 'auto' : p.h + 'px',
            fontSize: p.ch ? (p.h + 9) + 'px' : undefined,
            borderRadius: p.round ? '50%' : '1px',
            animationDelay: p.delay + 'ms',
            animationDuration: p.dur + 'ms',
            '--fx-spin': p.spin + 'deg',
            '--fx-drift': p.drift + 'px',
          }}>{p.ch}</span>
      ))}
    </div>
  );
}

function FxLayer() {
  const [bursts, setBursts] = useFx([]);
  const seq = useFxR(0);
  useFxE(() => {
    window.spawnConfetti = (opts) => {
      const id = ++seq.current;
      setBursts(b => (b.length > 2 ? b : b.concat({ id, big: !!(opts && opts.big) })));
    };
  }, []);
  return (
    <React.Fragment>
      {bursts.map(b => (
        <ConfettiBurst key={b.id} big={b.big}
          onDone={() => setBursts(list => list.filter(x => x.id !== b.id))}/>
      ))}
      <MascotLayer/>
    </React.Fragment>
  );
}

/* v402：mxGetPet／mxPetOf 給 app.jsx 的登出過場用（要畫「現在這一隻」跟你說再見）*/
Object.assign(window, { ClaudeMascot, OwlMascot, FlameMascot, RockMascot, SproutMascot,
  MX_PETS, mxGetPet, mxPetOf, MascotLayer, FxLayer, ConfettiBurst });

/* 自己掛載——不動 App 的樹，任何頁面都在 */
(function mountFx() {
  try {
    const host = document.createElement('div');
    host.id = '__fx-root';
    document.body.appendChild(host);
    ReactDOM.createRoot(host).render(<FxLayer/>);
  } catch (e) { /* 特效掛不上去也不能影響主程式 */ }
})();
