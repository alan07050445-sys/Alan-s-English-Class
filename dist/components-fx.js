function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// components-fx.jsx — v375
// ① 吉祥物 Claudius（像素風小傢伙）：會走路、跳、翻滾、打瞌睡、答對時比讚
// ② 完成特效：彩帶 + 音效（QmCelebrate / window.spawnConfetti 都走這裡）
// 這一層是獨立掛載的（自己 append 一個 div 到 body），不動 App 的樹，
// 所以任何頁面都看得到，也不會影響原本的版面計算。

var {
  useState: useFx,
  useEffect: useFxE,
  useRef: useFxR
} = React;

/* ── 像素風吉祥物 ────────────────────────────────────────────
   9×8 的格子：頭上兩個小角、兩顆方眼睛、三隻腳。
   腳分成三塊，走路時左右腳輪流抬起來。 */
/* v385（Alan）：帽子不再「自動解鎖」，改成商店裡用星星買的東西。
   v431：全部搬到 data.js 的 MX_SHOP（頭飾／配件／特效／語音／動作一起賣），
   這裡只留「怎麼畫」。舊的兩頂（party／crown，老師手動扣點買的）畫法一模一樣，
   id 也還認得，戴著的人不會突然變成沒戴。
   ⚠ 座標在 18×20 的格子裡（見下面 v402 的說明）：y −4~0 是頭上的地盤，
     身體 y2~12、腳 y12~16，所以配件畫在 y2 以下。 */
var MX_HATS = [{
  id: 'party',
  zh: '派對帽',
  cost: 500
}, {
  id: 'crown',
  zh: '皇冠',
  cost: 1000
}];
/* ══ v435：每一隻的「裝扮錨點」（Alan：「要完全符合每一隻的造型，不能有硬塞上去的樣子」）══
   帽子一律畫在同一個標準空間（頭寬 18、頭頂在 y=0、帽子往上長到 y=−4），
   再用每一隻自己的 hat{x,y,s} 搬過去＋縮放：
     · Claudius 頭就是 18 寬 → 原尺寸
     · 咕咕 頭頂在 y2（上面那兩撮是耳羽）→ 往下挪、縮一點，帽子才不會浮在耳羽上面
     · 小焰 尖端只有 2 寬 → 戴在比較寬的中段（y4 那一層有 10 寬），縮到 0.62
     · 阿石 頂面只有 x5~14 → 對準 9.5、縮到 0.62
     · 小芽 頭上是兩片葉子 → 帽子坐在葉子上緣、縮到 0.86
   配件則用 eye（眼睛帶）／neck（脖子）／side（側邊）三個位置算出來畫，
   所以墨鏡一定蓋在那一隻的眼睛上、圍巾一定在脖子上，不會有「飄在旁邊」的情況。 */
var MX_FIT = {
  clay: {
    hat: {
      x: 9,
      y: 0,
      s: 1.06
    },
    eye: {
      y: 4,
      h: 4,
      x0: 1,
      x1: 17
    },
    neck: {
      y: 9.5
    },
    side: {
      y: 7
    }
  },
  owl: {
    hat: {
      x: 9,
      y: 1.4,
      s: 1.0
    },
    eye: {
      y: 3.2,
      h: 5.6,
      x0: 1,
      x1: 17
    },
    neck: {
      y: 10
    },
    side: {
      y: 6
    }
  },
  flame: {
    hat: {
      x: 9,
      y: 3.4,
      s: 0.86
    },
    eye: {
      y: 7,
      h: 4,
      x0: 3,
      x1: 15
    },
    neck: {
      y: 10.6
    },
    side: {
      y: 8.5
    }
  },
  rock: {
    hat: {
      x: 9.5,
      y: -0.2,
      s: 0.85
    },
    eye: {
      y: 5,
      h: 4,
      x0: 2,
      x1: 16
    },
    neck: {
      y: 10
    },
    side: {
      y: 6
    }
  },
  sprout: {
    hat: {
      x: 9,
      y: 0,
      s: 0.96
    },
    eye: {
      y: 5,
      h: 4,
      x0: 2,
      x1: 16
    },
    neck: {
      y: 9.6
    },
    side: {
      y: 6
    }
  },
  /* v507 小兔：帽子改畫在耳朵前面（見 BunnyMascot 裡的註解）之後，
     就不用再為了「不要蓋掉耳朵」把它縮到 0.82——那隻會讓帽子整個看不見。
     s 回到跟其他夥伴同一個量級（0.92），y 往上提到 0.6＝剛好坐在頭頂上。
     ⚠ 眼睛的範圍本來寫 2~16，實際上兔子的眼睛是 3~7 與 11~15，
       墨鏡照 2~16 畫會比臉還寬。 */
  bun: {
    hat: {
      x: 9,
      y: 0.6,
      s: 0.92
    },
    eye: {
      y: 4,
      h: 4,
      x0: 3,
      x1: 15
    },
    neck: {
      y: 8.6
    },
    side: {
      y: 6
    }
  }
};
var MX_FIT_DEF = MX_FIT.clay;
/* 帽子的畫法（標準空間：頭頂 y=0、往上到 y=−4.6、頭寬 18）。
   v435：每一頂都加深色收邊、體積也放大——小小一塊色在 40px 的身體上根本看不出來。 */
var OUTLINE = '#2B2A26';
var MX_HAT_ART = {
  hat_cap:
  /*#__PURE__*/
  /* 鴨舌帽：圓頂＋右邊短帽簷 */
  React.createElement("g", {
    className: "mx-hat"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M1.4 0.6 A7.6 6 0 0 1 16.6 0.6 Z",
    fill: OUTLINE
  }), /*#__PURE__*/React.createElement("path", {
    d: "M2.3 0.4 A6.7 5.2 0 0 1 15.7 0.4 Z",
    fill: "#2E6F9E"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M2.3 0.4 A6.7 5.2 0 0 1 9 -4.8 L9 0.4 Z",
    fill: "#3E86BC"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "1.4",
    y: "0",
    width: "15.2",
    height: "2",
    rx: "0.8",
    fill: OUTLINE
  }), /*#__PURE__*/React.createElement("rect", {
    x: "1.9",
    y: "0.35",
    width: "14.2",
    height: "1.3",
    rx: "0.6",
    fill: "#24567A"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M15.6 0.2 h3.4 a1.1 1.1 0 0 1 0 2.2 h-3.4 z",
    fill: OUTLINE
  }), /*#__PURE__*/React.createElement("path", {
    d: "M15.8 0.5 h3 a0.8 0.8 0 0 1 0 1.6 h-3 z",
    fill: "#1E4763"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "9",
    cy: "-5",
    r: "1",
    fill: "#E8C86A",
    stroke: OUTLINE,
    strokeWidth: "0.35"
  })),
  hat_crown:
  /*#__PURE__*/
  /* 皇冠：三個尖角變高、寶石變大 */
  React.createElement("g", {
    className: "mx-hat"
  }, /*#__PURE__*/React.createElement("polygon", {
    points: "1.2,0.6 1.2,-6.4 5.2,-3 9,-7.6 12.8,-3 16.8,-6.4 16.8,0.6",
    fill: OUTLINE
  }), /*#__PURE__*/React.createElement("polygon", {
    points: "2.2,0 2.2,-5.2 5.2,-2.2 9,-6.4 12.8,-2.2 15.8,-5.2 15.8,0",
    fill: "#E8C86A"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "1.2",
    y: "-0.4",
    width: "15.6",
    height: "2.6",
    rx: "0.8",
    fill: OUTLINE
  }), /*#__PURE__*/React.createElement("rect", {
    x: "1.9",
    y: "0",
    width: "14.2",
    height: "1.8",
    rx: "0.6",
    fill: "#D8A93C"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "9",
    cy: "0.9",
    r: "1",
    fill: "#C1454A",
    stroke: OUTLINE,
    strokeWidth: "0.3"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "4.4",
    cy: "0.9",
    r: "0.75",
    fill: "#2E6F9E",
    stroke: OUTLINE,
    strokeWidth: "0.3"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "13.6",
    cy: "0.9",
    r: "0.75",
    fill: "#2E7D5B",
    stroke: OUTLINE,
    strokeWidth: "0.3"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "9",
    cy: "-6.6",
    r: "1.1",
    fill: "#FBF6EA",
    stroke: OUTLINE,
    strokeWidth: "0.4"
  })),
  hat_party:
  /*#__PURE__*/
  /* 派對帽：變高、加條紋、大絨球 */
  React.createElement("g", {
    className: "mx-hat"
  }, /*#__PURE__*/React.createElement("polygon", {
    points: "9,-9.2 15.6,0.8 2.4,0.8",
    fill: OUTLINE
  }), /*#__PURE__*/React.createElement("polygon", {
    points: "9,-8.2 14.4,0.2 3.6,0.2",
    fill: "#D6533C"
  }), /*#__PURE__*/React.createElement("polygon", {
    points: "9,-8.2 10.6,-5.6 7.4,-5.6",
    fill: "#E8C86A"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "5.1",
    y: "-3.4",
    width: "7.8",
    height: "1.4",
    fill: "#FBF6EA"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "4.1",
    y: "-1.2",
    width: "9.8",
    height: "1.4",
    fill: "#E8C86A"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "9",
    cy: "-9.4",
    r: "1.9",
    fill: "#E8C86A",
    stroke: OUTLINE,
    strokeWidth: "0.5"
  })),
  hat_grad:
  /*#__PURE__*/
  /* 畢業帽：板子更大、流蘇更長 */
  React.createElement("g", {
    className: "mx-hat"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "4.2",
    y: "-5",
    width: "9.6",
    height: "3.4",
    rx: "0.8",
    fill: OUTLINE
  }), /*#__PURE__*/React.createElement("rect", {
    x: "4.8",
    y: "-4.4",
    width: "8.4",
    height: "2.8",
    rx: "0.6",
    fill: "#3A3833"
  }), /*#__PURE__*/React.createElement("polygon", {
    points: "-1.2,-1.8 19.2,-1.8 16.4,0.9 1.6,0.9",
    fill: OUTLINE
  }), /*#__PURE__*/React.createElement("polygon", {
    points: "0,-1.4 18,-1.4 15.6,0.4 2.4,0.4",
    fill: "#2B2A26"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "15.8",
    y: "-1.8",
    width: "1.3",
    height: "5.4",
    rx: "0.5",
    fill: "#E8C86A"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "16.4",
    cy: "4",
    r: "1.5",
    fill: "#E8C86A",
    stroke: OUTLINE,
    strokeWidth: "0.4"
  })),
  hat_flower:
  /*#__PURE__*/
  /* 小花：五片花瓣＋花心＋葉子＋小花苞（可愛一點） */
  React.createElement("g", {
    className: "mx-hat"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12.4",
    cy: "-5",
    r: "1.95",
    fill: "#F0A9C4",
    stroke: OUTLINE,
    strokeWidth: "0.45"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "14.4",
    cy: "-3.5",
    r: "1.95",
    fill: "#F0A9C4",
    stroke: OUTLINE,
    strokeWidth: "0.45"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "13.6",
    cy: "-1.1",
    r: "1.95",
    fill: "#EA9BBB",
    stroke: OUTLINE,
    strokeWidth: "0.45"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "11.2",
    cy: "-1.1",
    r: "1.95",
    fill: "#EA9BBB",
    stroke: OUTLINE,
    strokeWidth: "0.45"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "10.4",
    cy: "-3.5",
    r: "1.95",
    fill: "#F0A9C4",
    stroke: OUTLINE,
    strokeWidth: "0.45"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12.4",
    cy: "-2.9",
    r: "1.55",
    fill: "#E8C86A",
    stroke: OUTLINE,
    strokeWidth: "0.45"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "-3.3",
    r: "0.45",
    fill: "#FBF6EA",
    opacity: ".8"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "6.8",
    cy: "-1.4",
    r: "1.5",
    fill: "#F0A9C4",
    stroke: OUTLINE,
    strokeWidth: "0.4"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "6.8",
    cy: "-1.4",
    r: "0.55",
    fill: "#E8C86A"
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: "9",
    cy: "0.4",
    rx: "1.7",
    ry: "0.85",
    transform: "rotate(-22 9 0.4)",
    fill: "#2E7D5B",
    stroke: OUTLINE,
    strokeWidth: "0.35"
  })),
  hat_bunny:
  /*#__PURE__*/
  /* 兔耳朵：長很多、粉紅內耳、深色收邊 */
  React.createElement("g", {
    className: "mx-hat"
  }, /*#__PURE__*/React.createElement("ellipse", {
    cx: "5.2",
    cy: "-4.6",
    rx: "2.6",
    ry: "5.4",
    transform: "rotate(-9 5.2 -4.6)",
    fill: OUTLINE
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: "12.8",
    cy: "-4.6",
    rx: "2.6",
    ry: "5.4",
    transform: "rotate(9 12.8 -4.6)",
    fill: OUTLINE
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: "5.2",
    cy: "-4.6",
    rx: "1.9",
    ry: "4.7",
    transform: "rotate(-9 5.2 -4.6)",
    fill: "#FBF6EA"
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: "12.8",
    cy: "-4.6",
    rx: "1.9",
    ry: "4.7",
    transform: "rotate(9 12.8 -4.6)",
    fill: "#FBF6EA"
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: "5.2",
    cy: "-4.8",
    rx: "0.95",
    ry: "3.2",
    transform: "rotate(-9 5.2 -4.8)",
    fill: "#F0A9C4"
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: "12.8",
    cy: "-4.8",
    rx: "0.95",
    ry: "3.2",
    transform: "rotate(9 12.8 -4.8)",
    fill: "#F0A9C4"
  })),
  hat_horn:
  /*#__PURE__*/
  /* 小鹿角：更高、每邊兩個分支 */
  React.createElement("g", {
    className: "mx-hat"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "3.2",
    y: "-6.6",
    width: "2.2",
    height: "7",
    rx: "0.9",
    fill: OUTLINE
  }), /*#__PURE__*/React.createElement("rect", {
    x: "12.6",
    y: "-6.6",
    width: "2.2",
    height: "7",
    rx: "0.9",
    fill: OUTLINE
  }), /*#__PURE__*/React.createElement("rect", {
    x: "3.5",
    y: "-6.3",
    width: "1.6",
    height: "6.5",
    rx: "0.7",
    fill: "#8A5A33"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "12.9",
    y: "-6.3",
    width: "1.6",
    height: "6.5",
    rx: "0.7",
    fill: "#8A5A33"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "0.4",
    y: "-5.4",
    width: "3.4",
    height: "2",
    rx: "0.8",
    fill: OUTLINE
  }), /*#__PURE__*/React.createElement("rect", {
    x: "14.2",
    y: "-5.4",
    width: "3.4",
    height: "2",
    rx: "0.8",
    fill: OUTLINE
  }), /*#__PURE__*/React.createElement("rect", {
    x: "0.7",
    y: "-5.1",
    width: "2.8",
    height: "1.4",
    rx: "0.6",
    fill: "#8A5A33"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "14.5",
    y: "-5.1",
    width: "2.8",
    height: "1.4",
    rx: "0.6",
    fill: "#8A5A33"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "1.4",
    y: "-3",
    width: "2.6",
    height: "1.8",
    rx: "0.7",
    fill: OUTLINE
  }), /*#__PURE__*/React.createElement("rect", {
    x: "14",
    y: "-3",
    width: "2.6",
    height: "1.8",
    rx: "0.7",
    fill: OUTLINE
  }), /*#__PURE__*/React.createElement("rect", {
    x: "1.7",
    y: "-2.7",
    width: "2",
    height: "1.2",
    rx: "0.5",
    fill: "#A16C3E"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "14.3",
    y: "-2.7",
    width: "2",
    height: "1.2",
    rx: "0.5",
    fill: "#A16C3E"
  })),
  hat_star:
  /*#__PURE__*/
  /* 星星髮箍：星星大很多 */
  React.createElement("g", {
    className: "mx-hat"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "0.8",
    y: "-1.6",
    width: "16.4",
    height: "2.6",
    rx: "1.1",
    fill: OUTLINE
  }), /*#__PURE__*/React.createElement("rect", {
    x: "1.4",
    y: "-1.2",
    width: "15.2",
    height: "1.8",
    rx: "0.8",
    fill: "#8A5FA8"
  }), /*#__PURE__*/React.createElement("polygon", {
    points: "12.6,-9.6 14.35,-5.9 18.4,-5.4 15.4,-2.6 16.2,1.4 12.6,-0.6 9,1.4 9.8,-2.6 6.8,-5.4 10.85,-5.9",
    fill: "#E8C86A",
    stroke: OUTLINE,
    strokeWidth: "0.7",
    strokeLinejoin: "round"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12.6",
    cy: "-4.2",
    r: "1.2",
    fill: "#FBF6EA",
    opacity: ".75"
  }))
};
/* 🔴 v507（Alan：「所有頭飾和配件都要試穿到每個吉祥物身上試穿，並且客製化才行，
     跟著縮放比例以及動態效果」）：本來一隻夥伴只有**一組** hat {x,y,s}，八頂帽子吃同一組。
   但八頂的高矮差很多（派對帽高到 y=−9.2、鴨舌帽只到 −5），
   而六隻的頭也完全不一樣（小兔有兩隻豎起來的耳朵、小焰頭是尖的、阿石是方的），
   所以「一隻一組」一定會有幾格怪怪的——實際把 8×6 排出來看就知道。
   改成可以針對單一組合微調：MX_FIT[pet].hats[hatId] = { x?, y?, s? }（疊在基準值上面）。
   沒有特別寫的就照基準走，所以大部分格子一行設定都不用。 */
function mxFitHat(fit, key) {
  var base = fit && fit.hat || MX_FIT_DEF.hat;
  var ov = fit && fit.hats && fit.hats[key] || null;
  if (!ov) return base;
  return {
    x: ov.x != null ? ov.x : base.x,
    y: ov.y != null ? ov.y : base.y,
    s: ov.s != null ? ov.s : base.s
  };
}
function MxHat({
  id,
  fit
}) {
  var key = id === 'party' ? 'hat_party' : id === 'crown' ? 'hat_crown' : id;
  var art = MX_HAT_ART[key];
  if (!art) return null;
  var f = mxFitHat(fit, key);
  // 標準空間的中心是 9；搬到這一隻的頭頂中心、再照頭寬縮放
  return /*#__PURE__*/React.createElement("g", {
    transform: `translate(${f.x - 9 * f.s} ${f.y}) scale(${f.s})`
  }, art);
}

/* v441：配件改成「畫在吉祥物的 SVG 裡面」（Alan：「當吉祥物在翻滾或是轉動時 配件不會跟著」）——
   以前配件是疊在上面的另一個 <svg>，動畫掛在 .mx-svg 上，它當然不會跟著轉。
   現在它是同一個 <svg> 裡的 <g>，所有翻滾／旋轉／縮放自動跟著走。
   分兩層畫：
     · back  ＝ 身體**後面**（書包本體、披風）——先畫，才會被身體蓋住一部分＝真的背在後面
     · front ＝ 身上（背帶、圍巾、墨鏡、蝴蝶結、魔法棒）
   位置一樣照每一隻的 eye／neck／side 錨點算，所以五隻都對得準。 */
function mxAccArt(id, fit) {
  var f = fit || MX_FIT_DEF;
  var eye = f.eye,
    neck = f.neck.y,
    side = f.side.y;
  if (id === 'it_glass') {
    /* 墨鏡：蓋住那一隻的兩顆眼睛（v441 加大加粗） */
    var w = (eye.x1 - eye.x0) / 2 + 0.2,
      h = eye.h + 1.4;
    return {
      front: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("rect", {
        x: eye.x0 - 0.6,
        y: eye.y - 0.8,
        width: w,
        height: h,
        rx: "0.8",
        fill: OUTLINE
      }), /*#__PURE__*/React.createElement("rect", {
        x: eye.x1 - w + 0.6,
        y: eye.y - 0.8,
        width: w,
        height: h,
        rx: "0.8",
        fill: OUTLINE
      }), /*#__PURE__*/React.createElement("rect", {
        x: eye.x0,
        y: eye.y - 0.3,
        width: w - 1.2,
        height: h - 1,
        rx: "0.6",
        fill: "#4A4741"
      }), /*#__PURE__*/React.createElement("rect", {
        x: eye.x1 - w + 1.2,
        y: eye.y - 0.3,
        width: w - 1.2,
        height: h - 1,
        rx: "0.6",
        fill: "#4A4741"
      }), /*#__PURE__*/React.createElement("rect", {
        x: eye.x0 + w - 1.2,
        y: eye.y + h / 2 - 1.2,
        width: eye.x1 - eye.x0 - 2 * w + 2.4,
        height: "1.2",
        fill: OUTLINE
      }), /*#__PURE__*/React.createElement("rect", {
        x: eye.x0 + 0.6,
        y: eye.y + 0.2,
        width: "2",
        height: "1.2",
        fill: "#9A968C"
      }))
    };
  }
  if (id === 'it_scarf') {
    /* 圍巾：繞一圈＋垂在前面的尾巴（加寬） */
    return {
      front: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("rect", {
        x: "-0.4",
        y: neck - 0.8,
        width: "18.8",
        height: "3.4",
        rx: "0.6",
        fill: OUTLINE
      }), /*#__PURE__*/React.createElement("rect", {
        x: "0",
        y: neck - 0.4,
        width: "18",
        height: "2.6",
        fill: "#C1454A"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "0",
        y: neck + 0.6,
        width: "18",
        height: "0.7",
        fill: "#9E3438"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "11.6",
        y: neck + 2,
        width: "3.6",
        height: "5.4",
        rx: "0.5",
        fill: OUTLINE
      }), /*#__PURE__*/React.createElement("rect", {
        x: "12",
        y: neck + 2.2,
        width: "2.8",
        height: "4.8",
        fill: "#C1454A"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "12",
        y: neck + 5.4,
        width: "2.8",
        height: "1.3",
        fill: "#8E3034"
      }))
    };
  }
  if (id === 'it_bow') {
    /* 蝴蝶結：大一點、紅色面積大一點 */
    var y = neck - 0.8;
    return {
      front: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("polygon", {
        points: `3.4,${y - 2.4} 8.2,${y + 0.8} 3.4,${y + 4}`,
        fill: OUTLINE
      }), /*#__PURE__*/React.createElement("polygon", {
        points: `14.6,${y - 2.4} 9.8,${y + 0.8} 14.6,${y + 4}`,
        fill: OUTLINE
      }), /*#__PURE__*/React.createElement("polygon", {
        points: `4.3,${y - 1.4} 7.8,${y + 0.8} 4.3,${y + 3}`,
        fill: "#D6533C"
      }), /*#__PURE__*/React.createElement("polygon", {
        points: `13.7,${y - 1.4} 10.2,${y + 0.8} 13.7,${y + 3}`,
        fill: "#D6533C"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "7.6",
        y: y - 0.6,
        width: "2.8",
        height: "2.8",
        rx: "0.7",
        fill: OUTLINE
      }), /*#__PURE__*/React.createElement("rect", {
        x: "8",
        y: y - 0.2,
        width: "2",
        height: "2",
        rx: "0.5",
        fill: "#B23A28"
      }))
    };
  }
  if (id === 'it_cape') {
    /* 披風：整片在身體後面（左右都露出來）＋前面一個領扣 */
    var top = side - 1;
    return {
      back: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("polygon", {
        points: `-1.6,${top} 19.6,${top} 21.4,16.4 -3.4,16.4`,
        fill: OUTLINE
      }), /*#__PURE__*/React.createElement("polygon", {
        points: `-1,${top + 0.5} 19,${top + 0.5} 20.6,15.8 -2.6,15.8`,
        fill: "#8A2F3B"
      }), /*#__PURE__*/React.createElement("polygon", {
        points: `-1,${top + 0.5} 3.4,${top + 0.5} 1.4,15.8 -2.6,15.8`,
        fill: "#6E2430"
      }), /*#__PURE__*/React.createElement("polygon", {
        points: `14.6,${top + 0.5} 19,${top + 0.5} 20.6,15.8 16.6,15.8`,
        fill: "#6E2430"
      })),
      front: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("rect", {
        x: "4.6",
        y: top - 0.6,
        width: "8.8",
        height: "2.4",
        rx: "0.8",
        fill: OUTLINE
      }), /*#__PURE__*/React.createElement("rect", {
        x: "5",
        y: top - 0.2,
        width: "8",
        height: "1.6",
        rx: "0.6",
        fill: "#6E2430"
      }), /*#__PURE__*/React.createElement("circle", {
        cx: "9",
        cy: top + 0.6,
        r: "1.1",
        fill: "#E8C86A",
        stroke: OUTLINE,
        strokeWidth: "0.35"
      }))
    };
  }
  if (id === 'it_wand') {
    /* 魔法棒：手拿起來的樣子（斜握在身體右邊、星星在上面） */
    var gripY = side + 3;
    return {
      front: /*#__PURE__*/React.createElement("g", {
        transform: `rotate(-18 16 ${gripY})`
      }, /*#__PURE__*/React.createElement("rect", {
        x: "15.1",
        y: gripY - 9,
        width: "2.2",
        height: "11.4",
        rx: "0.9",
        fill: OUTLINE
      }), /*#__PURE__*/React.createElement("rect", {
        x: "15.5",
        y: gripY - 8.6,
        width: "1.4",
        height: "10.6",
        fill: "#6B5B45"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "14.6",
        y: gripY - 0.6,
        width: "3.2",
        height: "2.6",
        rx: "0.9",
        fill: OUTLINE
      }), /*#__PURE__*/React.createElement("rect", {
        x: "14.9",
        y: gripY - 0.3,
        width: "2.6",
        height: "2",
        rx: "0.7",
        fill: "#9A7F53"
      }), /*#__PURE__*/React.createElement("polygon", {
        points: `16.2,${gripY - 15.4} 17.5,${gripY - 12.6} 20.5,${gripY - 12.2} 18.3,${gripY - 10.2} 18.9,${gripY - 7.3} 16.2,${gripY - 8.8} 13.5,${gripY - 7.3} 14.1,${gripY - 10.2} 11.9,${gripY - 12.2} 14.9,${gripY - 12.6}`,
        fill: "#E8C86A",
        stroke: OUTLINE,
        strokeWidth: "0.6",
        strokeLinejoin: "round"
      }), /*#__PURE__*/React.createElement("circle", {
        cx: "16.2",
        cy: gripY - 11.4,
        r: "0.9",
        fill: "#FBF6EA",
        opacity: ".8"
      }))
    };
  }
  return null;
}
/* v507：配件本來只能靠 eye／neck／side 三個錨點自動對位，對不準就沒救。
   多給一層 MX_FIT[pet].accs[accId] = { dx?, dy?, s? }（繞著身體中心 x=9 縮放），
   個別組合對不準時可以再推一下。 */
function MxAcc({
  id,
  fit,
  layer
}) {
  var art = mxAccArt(id, fit);
  var g = art && art[layer || 'front'];
  if (!g) return null;
  var ov = fit && fit.accs && fit.accs[id] || null;
  var inner = ov ? /*#__PURE__*/React.createElement("g", {
    transform: `translate(${(ov.dx || 0) + 9 * (1 - (ov.s != null ? ov.s : 1))} ${ov.dy || 0}) scale(${ov.s != null ? ov.s : 1})`
  }, g) : g;
  // 包一層 class 只是為了好認（測試會檢查它在 .mx-svg 裡面＝真的會跟著動）
  return /*#__PURE__*/React.createElement("g", {
    className: 'mx-acc mx-acc-' + (layer || 'front')
  }, inner);
}

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
  try {
    return window._currentUser && window._currentUser.uid || '';
  } catch (e) {
    return '';
  }
}
function mxKey(base) {
  var uid = mxUid();
  return uid ? base + ':' + uid : base;
}
/* 一次性搬家：舊的公用值搬給「更新後第一個登入的帳號」，然後把公用 key 刪掉，
   後面的帳號就是全新的。刻意**不搬 alan-mx-off（休息）**——那正是 Alan 回報的問題，
   誰的休息都不該跟著別人走，所以一律清掉、大家醒著。 */
function mxMigrateOnce() {
  try {
    var uid = mxUid();
    if (!uid) return;
    localStorage.removeItem('alan-mx-off'); // 舊的公用「休息」直接作廢
    ['alan-mx-hat', 'alan-mx-name', 'alan-mx-pet'].forEach(base => {
      var old = localStorage.getItem(base);
      if (old == null) return;
      if (localStorage.getItem(base + ':' + uid) == null) localStorage.setItem(base + ':' + uid, old);
      localStorage.removeItem(base);
    });
  } catch (e) {}
}

/* v431：戴什麼不再存在這台電腦的 localStorage，而是存在帳號的 progress/{uid}.mx.wear
   （data.js mxWearOf）——換一台裝置、換一個帳號都跟著人走，不會互相影響。
   舊的 alan-mx-hat 只剩「以前買過帽子的人第一次進來自動幫他戴上」這一個用途。 */
var MX_HAT_KEY = 'alan-mx-hat';
function mxOwnedHats() {
  return (window.__mxHats || []).filter(h => MX_HATS.some(x => x.id === h));
}
function mxGetHat() {
  try {
    return localStorage.getItem(mxKey(MX_HAT_KEY)) || '';
  } catch (e) {
    return '';
  }
}
function mxSetHat(h) {
  try {
    localStorage.setItem(mxKey(MX_HAT_KEY), h || '');
  } catch (e) {}
}

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
function ClaudeMascot({
  size = 46,
  hat = 'none',
  acc = ''
}) {
  var CLAY = '#C1785A',
    EYE = '#1A1A1A';
  return /*#__PURE__*/React.createElement("svg", {
    className: "mx-svg",
    width: size,
    height: size * 10 / 9,
    viewBox: "0 -4 18 20",
    shapeRendering: "crispEdges",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement(MxHat, {
    id: hat,
    fit: MX_FIT.clay
  }), /*#__PURE__*/React.createElement(MxAcc, {
    id: acc,
    fit: MX_FIT.clay,
    layer: "back"
  }), /*#__PURE__*/React.createElement("g", {
    className: "mx-torso"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "2",
    y: "0",
    width: "2",
    height: "2",
    fill: CLAY
  }), /*#__PURE__*/React.createElement("rect", {
    x: "14",
    y: "0",
    width: "2",
    height: "2",
    fill: CLAY
  }), /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: "2",
    width: "18",
    height: "10",
    fill: CLAY
  }), /*#__PURE__*/React.createElement("rect", {
    className: "mx-eye",
    x: "2",
    y: "4",
    width: "4",
    height: "4",
    fill: EYE
  }), /*#__PURE__*/React.createElement("rect", {
    className: "mx-eye",
    x: "12",
    y: "4",
    width: "4",
    height: "4",
    fill: EYE
  })), /*#__PURE__*/React.createElement("g", {
    className: "mx-leg mx-leg-a"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: "12",
    width: "4",
    height: "4",
    fill: CLAY
  })), /*#__PURE__*/React.createElement("g", {
    className: "mx-leg mx-leg-b"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "6",
    y: "12",
    width: "6",
    height: "4",
    fill: CLAY
  })), /*#__PURE__*/React.createElement("g", {
    className: "mx-leg mx-leg-c"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "14",
    y: "12",
    width: "4",
    height: "4",
    fill: CLAY
  })), /*#__PURE__*/React.createElement("g", {
    className: "mx-prop mx-prop-type"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "2",
    y: "9",
    width: "14",
    height: "5",
    fill: "#4A443A"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "10",
    width: "12",
    height: "3",
    fill: "#9FD8BC"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: "14",
    width: "18",
    height: "2",
    fill: "#6B6355"
  })), /*#__PURE__*/React.createElement(MxAcc, {
    id: acc,
    fit: MX_FIT.clay,
    layer: "front"
  }));
}

/* ══ v528 🧛 萬聖節：每一隻都變成吸血鬼 ══════════════════════════
   Alan：「吉祥物幫我一律都改成 Vampire，幫我結合成我的吉祥物風格，
   改成畫素畫素的感覺」。

   ⭐ 做法是「同一套骨架、換一身裝」而不是另外畫一隻新的：
     · 一樣的 18×20 網格、一樣的 viewBox、一樣的 .mx-torso / .mx-eye /
       .mx-leg-a|b|c —— 所以走路、跳、翻滾、打瞌睡那十幾支 CSS 動畫
       **一行都不用改**，帽子與配件的貼合（MX_FIT）也照舊。
     · 披風內裡用「那一隻原本的主色」(tone)，所以五隻都是吸血鬼，
       但你還是看得出來哪一隻是你的 —— 這就是「結合成我的吉祥物風格」。
   ⚠ 招牌動作的道具（打電腦／看書）要一起帶過來：CSS 是用
     `.act-type .mx-prop-type` 控制顯示的，沒畫就等於那隻的招牌動作變成空的。
     兩個都畫，平常 `.mx-prop { opacity:0 }` 本來就會把沒用到的藏起來。 */
/* v529 🦇 蝙蝠型態：點一下吸血鬼就變成這個，再點一次變回來（Alan 指定）。
   ⚠ 骨架規則跟其他夥伴完全一樣（.mx-torso ＋ 兩顆 .mx-eye ＋ 三個 .mx-leg），
     不然變身之後走路、打瞌睡那些動畫全部失效。
   ⚠ 變身時帽子與配件先收起來：蝙蝠沒有頭頂也沒有脖子，硬戴上去會飄在空中。 */
function BatForm({
  size = 46,
  tone = '#C1785A'
}) {
  /* ⚠ 不能太深：頁面底是 #1E1333，剪影要看得出來才像蝙蝠不是一團黑 */
  var WING = '#403A52',
    BONE = '#2F2A3F',
    BODY = '#4E4664',
    EYE = '#FFFFFF',
    PUP = '#15131A',
    FANG = '#FFFFFF';
  /* 🦇 v549（Alan：「蝙蝠也要會飛，翅膀真實一點」）
     本來是兩塊不會動的方塊。真的蝙蝠翅膀有三個特徵，這裡都畫出來：
       ① 前緣是一條斜線（手臂骨），翼尖在最高處
       ② 翼膜往下垂，下緣是**三個尖角**（手指之間的膜被拉成扇形）
       ③ 翅膀從肩膀拍動（CSS 以肩膀為軸轉動），所以左右要各自一個 <g>
     畫左翅，右翅用鏡射（x → 17 - x）。每一列是 [起點x, 寬度]。 */
  var ROWS = [[1, 0, 1], [2, 0, 2], [3, 0, 3], [4, 0, 5], [5, 0, 5], [6, 0, 5], [7, 0, 1], [7, 2, 1], [7, 4, 1], [8, 0, 1]];
  var bones = [[0, 1], [1, 2], [2, 3], [3, 4]]; // 前緣：從翼尖斜向肩膀
  var wing = mirror => /*#__PURE__*/React.createElement(React.Fragment, null, ROWS.map(([y, x, w], k) => /*#__PURE__*/React.createElement("rect", {
    key: k,
    x: mirror ? 17 - x - (w - 1) : x,
    y: y,
    width: w,
    height: "1",
    fill: WING
  })), bones.map(([x, y], k) => /*#__PURE__*/React.createElement("rect", {
    key: 'b' + k,
    x: mirror ? 17 - x : x,
    y: y,
    width: "1",
    height: "1",
    fill: BONE
  })), /*#__PURE__*/React.createElement("rect", {
    x: mirror ? 14 : 3,
    y: "5",
    width: "1",
    height: "1",
    fill: BONE
  }), /*#__PURE__*/React.createElement("rect", {
    x: mirror ? 15 : 2,
    y: "6",
    width: "1",
    height: "1",
    fill: BONE
  }), /*#__PURE__*/React.createElement("rect", {
    x: mirror ? 17 : 0,
    y: "7",
    width: "1",
    height: "1",
    fill: BONE
  }), /*#__PURE__*/React.createElement("rect", {
    x: mirror ? 13 : 4,
    y: "5",
    width: "1",
    height: "2",
    fill: tone
  }));
  return /*#__PURE__*/React.createElement("svg", {
    className: "mx-svg",
    width: size,
    height: size * 10 / 9,
    viewBox: "0 -4 18 20",
    shapeRendering: "crispEdges",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("g", {
    className: "mx-torso"
  }, /*#__PURE__*/React.createElement("g", {
    className: "mx-wing mx-wing-l"
  }, wing(false)), /*#__PURE__*/React.createElement("g", {
    className: "mx-wing mx-wing-r"
  }, wing(true)), /*#__PURE__*/React.createElement("rect", {
    x: "5",
    y: "1",
    width: "2",
    height: "2",
    fill: BODY
  }), /*#__PURE__*/React.createElement("rect", {
    x: "11",
    y: "1",
    width: "2",
    height: "2",
    fill: BODY
  }), /*#__PURE__*/React.createElement("rect", {
    x: "5",
    y: "3",
    width: "8",
    height: "7",
    fill: BODY
  }), /*#__PURE__*/React.createElement("rect", {
    className: "mx-eye",
    x: "6",
    y: "5",
    width: "2",
    height: "2",
    fill: EYE
  }), /*#__PURE__*/React.createElement("rect", {
    className: "mx-eye",
    x: "10",
    y: "5",
    width: "2",
    height: "2",
    fill: EYE
  }), /*#__PURE__*/React.createElement("rect", {
    x: "7",
    y: "6",
    width: "1",
    height: "1",
    fill: PUP
  }), /*#__PURE__*/React.createElement("rect", {
    x: "10",
    y: "6",
    width: "1",
    height: "1",
    fill: PUP
  }), /*#__PURE__*/React.createElement("rect", {
    x: "8",
    y: "7",
    width: "2",
    height: "1",
    fill: PUP
  }), /*#__PURE__*/React.createElement("rect", {
    x: "8",
    y: "8",
    width: "1",
    height: "1",
    fill: FANG
  }), /*#__PURE__*/React.createElement("rect", {
    x: "9",
    y: "8",
    width: "1",
    height: "1",
    fill: FANG
  })), /*#__PURE__*/React.createElement("g", {
    className: "mx-leg mx-leg-a"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "6",
    y: "10",
    width: "2",
    height: "2",
    fill: WING
  })), /*#__PURE__*/React.createElement("g", {
    className: "mx-leg mx-leg-b"
  }), /*#__PURE__*/React.createElement("g", {
    className: "mx-leg mx-leg-c"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "10",
    y: "10",
    width: "2",
    height: "2",
    fill: WING
  })));
}
function VampireMascot({
  size = 46,
  hat = 'none',
  acc = '',
  tone = '#C1785A',
  fit,
  bat
}) {
  if (bat) return /*#__PURE__*/React.createElement(BatForm, {
    size: size,
    tone: tone
  });
  var CAPE = '#1E1B24',
    HAIR = '#15131A',
    SKIN = '#DCE9F4',
    BLUSH = '#F2A7B0',
    EYE = '#15131A',
    FANG = '#FFFFFF',
    BOOT = '#5A5470';
  var F = fit || MX_FIT_DEF;
  return /*#__PURE__*/React.createElement("svg", {
    className: "mx-svg",
    width: size,
    height: size * 10 / 9,
    viewBox: "0 -4 18 20",
    shapeRendering: "crispEdges",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement(MxHat, {
    id: hat,
    fit: F
  }), /*#__PURE__*/React.createElement(MxAcc, {
    id: acc,
    fit: F,
    layer: "back"
  }), /*#__PURE__*/React.createElement("g", {
    className: "mx-torso"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: "11",
    width: "18",
    height: "3",
    fill: CAPE
  }), /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: "12",
    width: "2",
    height: "2",
    fill: tone
  }), /*#__PURE__*/React.createElement("rect", {
    x: "16",
    y: "12",
    width: "2",
    height: "2",
    fill: tone
  }), /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: "6",
    width: "2",
    height: "2",
    fill: SKIN
  }), /*#__PURE__*/React.createElement("rect", {
    x: "16",
    y: "6",
    width: "2",
    height: "2",
    fill: SKIN
  }), /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: "5",
    width: "1",
    height: "1",
    fill: SKIN
  }), /*#__PURE__*/React.createElement("rect", {
    x: "17",
    y: "5",
    width: "1",
    height: "1",
    fill: SKIN
  }), /*#__PURE__*/React.createElement("rect", {
    x: "2",
    y: "4",
    width: "14",
    height: "7",
    fill: SKIN
  }), /*#__PURE__*/React.createElement("rect", {
    x: "5",
    y: "0",
    width: "8",
    height: "1",
    fill: HAIR
  }), /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "1",
    width: "12",
    height: "1",
    fill: HAIR
  }), /*#__PURE__*/React.createElement("rect", {
    x: "2",
    y: "2",
    width: "14",
    height: "2",
    fill: HAIR
  }), /*#__PURE__*/React.createElement("rect", {
    x: "2",
    y: "4",
    width: "2",
    height: "2",
    fill: HAIR
  }), /*#__PURE__*/React.createElement("rect", {
    x: "14",
    y: "4",
    width: "2",
    height: "2",
    fill: HAIR
  }), /*#__PURE__*/React.createElement("rect", {
    x: "8",
    y: "4",
    width: "2",
    height: "1",
    fill: HAIR
  }), /*#__PURE__*/React.createElement("rect", {
    className: "mx-eye",
    x: "4",
    y: "6",
    width: "3",
    height: "3",
    fill: EYE
  }), /*#__PURE__*/React.createElement("rect", {
    className: "mx-eye",
    x: "11",
    y: "6",
    width: "3",
    height: "3",
    fill: EYE
  }), /*#__PURE__*/React.createElement("rect", {
    x: "6",
    y: "6",
    width: "1",
    height: "1",
    fill: FANG
  }), /*#__PURE__*/React.createElement("rect", {
    x: "13",
    y: "6",
    width: "1",
    height: "1",
    fill: FANG
  }), /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "9",
    width: "2",
    height: "1",
    fill: BLUSH
  }), /*#__PURE__*/React.createElement("rect", {
    x: "13",
    y: "9",
    width: "2",
    height: "1",
    fill: BLUSH
  }), /*#__PURE__*/React.createElement("rect", {
    x: "7",
    y: "9",
    width: "4",
    height: "1",
    fill: EYE
  }), /*#__PURE__*/React.createElement("rect", {
    x: "7",
    y: "10",
    width: "1",
    height: "1",
    fill: FANG
  }), /*#__PURE__*/React.createElement("rect", {
    x: "10",
    y: "10",
    width: "1",
    height: "1",
    fill: FANG
  }), /*#__PURE__*/React.createElement("rect", {
    x: "5",
    y: "11",
    width: "8",
    height: "3",
    fill: CAPE
  }), /*#__PURE__*/React.createElement("rect", {
    x: "4",
    y: "11",
    width: "3",
    height: "1",
    fill: tone
  }), /*#__PURE__*/React.createElement("rect", {
    x: "11",
    y: "11",
    width: "3",
    height: "1",
    fill: tone
  }), /*#__PURE__*/React.createElement("rect", {
    x: "8",
    y: "12",
    width: "2",
    height: "1",
    fill: SKIN
  })), /*#__PURE__*/React.createElement("g", {
    className: "mx-cape"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: "14",
    width: "4",
    height: "1",
    fill: CAPE
  }), /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: "15",
    width: "3",
    height: "1",
    fill: tone
  }), /*#__PURE__*/React.createElement("rect", {
    x: "14",
    y: "14",
    width: "4",
    height: "1",
    fill: CAPE
  }), /*#__PURE__*/React.createElement("rect", {
    x: "15",
    y: "15",
    width: "3",
    height: "1",
    fill: tone
  })), /*#__PURE__*/React.createElement("g", {
    className: "mx-leg mx-leg-a"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "4",
    y: "14",
    width: "4",
    height: "1",
    fill: CAPE
  }), /*#__PURE__*/React.createElement("rect", {
    x: "4",
    y: "15",
    width: "4",
    height: "1",
    fill: BOOT
  })), /*#__PURE__*/React.createElement("g", {
    className: "mx-leg mx-leg-b"
  }), /*#__PURE__*/React.createElement("g", {
    className: "mx-leg mx-leg-c"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "10",
    y: "14",
    width: "4",
    height: "1",
    fill: CAPE
  }), /*#__PURE__*/React.createElement("rect", {
    x: "10",
    y: "15",
    width: "4",
    height: "1",
    fill: BOOT
  })), /*#__PURE__*/React.createElement("g", {
    className: "mx-prop mx-prop-type"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "2",
    y: "9",
    width: "14",
    height: "5",
    fill: "#4A443A"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "10",
    width: "12",
    height: "3",
    fill: "#9FD8BC"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: "14",
    width: "18",
    height: "2",
    fill: "#6B6355"
  })), /*#__PURE__*/React.createElement("g", {
    className: "mx-prop mx-prop-read"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "2",
    y: "10",
    width: "14",
    height: "6",
    fill: "#6B1220"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "10",
    width: "6",
    height: "4",
    fill: "#F3EEFF"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "10",
    y: "10",
    width: "6",
    height: "4",
    fill: "#F3EEFF"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "4",
    y: "11",
    width: "4",
    height: "1",
    fill: "#C7B9DE"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "11",
    y: "11",
    width: "4",
    height: "1",
    fill: "#C7B9DE"
  })), /*#__PURE__*/React.createElement(MxAcc, {
    id: acc,
    fit: F,
    layer: "front"
  }));
}

/* ② 咕咕（貓頭鷹）—— 眼睛大、愛看書，走得少想得多 */
function OwlMascot({
  size = 46,
  hat = 'none',
  acc = ''
}) {
  var BODY = '#A9713F',
    DARK = '#7A4E27',
    RING = '#FBF6EA',
    BEAK = '#E8A33C',
    BELLY = '#E4C79B',
    EYE = '#1A1A1A';
  return /*#__PURE__*/React.createElement("svg", {
    className: "mx-svg",
    width: size,
    height: size * 10 / 9,
    viewBox: "0 -4 18 20",
    shapeRendering: "crispEdges",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement(MxHat, {
    id: hat,
    fit: MX_FIT.owl
  }), /*#__PURE__*/React.createElement(MxAcc, {
    id: acc,
    fit: MX_FIT.owl,
    layer: "back"
  }), /*#__PURE__*/React.createElement("g", {
    className: "mx-torso"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "2",
    y: "0",
    width: "3",
    height: "2",
    fill: DARK
  }), /*#__PURE__*/React.createElement("rect", {
    x: "13",
    y: "0",
    width: "3",
    height: "2",
    fill: DARK
  }), /*#__PURE__*/React.createElement("rect", {
    x: "1",
    y: "2",
    width: "16",
    height: "2",
    fill: BODY
  }), /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: "4",
    width: "18",
    height: "6",
    fill: BODY
  }), /*#__PURE__*/React.createElement("rect", {
    x: "1",
    y: "10",
    width: "16",
    height: "2",
    fill: BODY
  }), /*#__PURE__*/React.createElement("rect", {
    x: "5",
    y: "9",
    width: "8",
    height: "3",
    fill: BELLY
  }), /*#__PURE__*/React.createElement("rect", {
    x: "2",
    y: "3",
    width: "6",
    height: "6",
    fill: RING
  }), /*#__PURE__*/React.createElement("rect", {
    x: "10",
    y: "3",
    width: "6",
    height: "6",
    fill: RING
  }), /*#__PURE__*/React.createElement("rect", {
    className: "mx-eye",
    x: "3",
    y: "4",
    width: "4",
    height: "4",
    fill: EYE
  }), /*#__PURE__*/React.createElement("rect", {
    className: "mx-eye",
    x: "11",
    y: "4",
    width: "4",
    height: "4",
    fill: EYE
  }), /*#__PURE__*/React.createElement("rect", {
    x: "8",
    y: "6",
    width: "2",
    height: "2",
    fill: BEAK
  }), /*#__PURE__*/React.createElement("rect", {
    x: "8",
    y: "8",
    width: "1",
    height: "1",
    fill: BEAK
  })), /*#__PURE__*/React.createElement("g", {
    className: "mx-leg mx-leg-a"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "12",
    width: "4",
    height: "3",
    fill: BEAK
  })), /*#__PURE__*/React.createElement("g", {
    className: "mx-leg mx-leg-b"
  }), /*#__PURE__*/React.createElement("g", {
    className: "mx-leg mx-leg-c"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "11",
    y: "12",
    width: "4",
    height: "3",
    fill: BEAK
  })), /*#__PURE__*/React.createElement("g", {
    className: "mx-prop mx-prop-read"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "2",
    y: "10",
    width: "14",
    height: "6",
    fill: "#8B3120"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "10",
    width: "6",
    height: "4",
    fill: "#FBF6EA"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "10",
    y: "10",
    width: "6",
    height: "4",
    fill: "#FBF6EA"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "4",
    y: "11",
    width: "4",
    height: "1",
    fill: "#D8CBB0"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "11",
    y: "11",
    width: "4",
    height: "1",
    fill: "#D8CBB0"
  })), /*#__PURE__*/React.createElement(MxAcc, {
    id: acc,
    fit: MX_FIT.owl,
    layer: "front"
  }));
}

/* ③ 小焰（火苗）—— 靜不下來，跑超快 */
function FlameMascot({
  size = 46,
  hat = 'none',
  acc = ''
}) {
  var OUT = '#D6533C',
    MID = '#E8873C',
    IN = '#F2C14E',
    EYE = '#3A1B12';
  return /*#__PURE__*/React.createElement("svg", {
    className: "mx-svg",
    width: size,
    height: size * 10 / 9,
    viewBox: "0 -4 18 20",
    shapeRendering: "crispEdges",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement(MxHat, {
    id: hat,
    fit: MX_FIT.flame
  }), /*#__PURE__*/React.createElement(MxAcc, {
    id: acc,
    fit: MX_FIT.flame,
    layer: "back"
  }), /*#__PURE__*/React.createElement("g", {
    className: "mx-torso"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "8",
    y: "0",
    width: "2",
    height: "2",
    fill: IN
  }), /*#__PURE__*/React.createElement("rect", {
    x: "6",
    y: "2",
    width: "6",
    height: "2",
    fill: IN
  }), /*#__PURE__*/React.createElement("rect", {
    x: "4",
    y: "4",
    width: "10",
    height: "2",
    fill: MID
  }), /*#__PURE__*/React.createElement("rect", {
    x: "2",
    y: "6",
    width: "14",
    height: "2",
    fill: OUT
  }), /*#__PURE__*/React.createElement("rect", {
    x: "1",
    y: "8",
    width: "16",
    height: "4",
    fill: OUT
  }), /*#__PURE__*/React.createElement("rect", {
    x: "6",
    y: "9",
    width: "6",
    height: "3",
    fill: MID
  }), /*#__PURE__*/React.createElement("rect", {
    className: "mx-eye",
    x: "4",
    y: "7",
    width: "4",
    height: "4",
    fill: EYE
  }), /*#__PURE__*/React.createElement("rect", {
    className: "mx-eye",
    x: "10",
    y: "7",
    width: "4",
    height: "4",
    fill: EYE
  })), /*#__PURE__*/React.createElement("g", {
    className: "mx-leg mx-leg-a"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "1",
    y: "12",
    width: "4",
    height: "3",
    fill: MID
  })), /*#__PURE__*/React.createElement("g", {
    className: "mx-leg mx-leg-b"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "6",
    y: "12",
    width: "6",
    height: "4",
    fill: IN
  })), /*#__PURE__*/React.createElement("g", {
    className: "mx-leg mx-leg-c"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "13",
    y: "12",
    width: "4",
    height: "3",
    fill: MID
  })), /*#__PURE__*/React.createElement(MxAcc, {
    id: acc,
    fit: MX_FIT.flame,
    layer: "front"
  }));
}

/* ④ 阿石（小石頭）—— 慢吞吞，最愛裝成路邊一顆普通的石頭 */
function RockMascot({
  size = 46,
  hat = 'none',
  acc = ''
}) {
  var ROCK = '#9A9384',
    DARK = '#6E695D',
    LIGHT = '#C4BDAC',
    EYE = '#1A1A1A';
  return /*#__PURE__*/React.createElement("svg", {
    className: "mx-svg",
    width: size,
    height: size * 10 / 9,
    viewBox: "0 -4 18 20",
    shapeRendering: "crispEdges",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement(MxHat, {
    id: hat,
    fit: MX_FIT.rock
  }), /*#__PURE__*/React.createElement(MxAcc, {
    id: acc,
    fit: MX_FIT.rock,
    layer: "back"
  }), /*#__PURE__*/React.createElement("g", {
    className: "mx-torso"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "5",
    y: "0",
    width: "9",
    height: "2",
    fill: LIGHT
  }), /*#__PURE__*/React.createElement("rect", {
    x: "2",
    y: "2",
    width: "14",
    height: "2",
    fill: ROCK
  }), /*#__PURE__*/React.createElement("rect", {
    x: "1",
    y: "4",
    width: "16",
    height: "8",
    fill: ROCK
  }), /*#__PURE__*/React.createElement("rect", {
    x: "6",
    y: "2",
    width: "4",
    height: "1",
    fill: LIGHT
  }), /*#__PURE__*/React.createElement("rect", {
    x: "13",
    y: "9",
    width: "2",
    height: "2",
    fill: DARK
  }), /*#__PURE__*/React.createElement("rect", {
    className: "mx-eye",
    x: "3",
    y: "5",
    width: "4",
    height: "4",
    fill: EYE
  }), /*#__PURE__*/React.createElement("rect", {
    className: "mx-eye",
    x: "11",
    y: "5",
    width: "4",
    height: "4",
    fill: EYE
  }), /*#__PURE__*/React.createElement("rect", {
    x: "8",
    y: "10",
    width: "2",
    height: "1",
    fill: DARK
  })), /*#__PURE__*/React.createElement("g", {
    className: "mx-leg mx-leg-a"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "2",
    y: "12",
    width: "4",
    height: "3",
    fill: DARK
  })), /*#__PURE__*/React.createElement("g", {
    className: "mx-leg mx-leg-b"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "7",
    y: "12",
    width: "4",
    height: "4",
    fill: ROCK
  })), /*#__PURE__*/React.createElement("g", {
    className: "mx-leg mx-leg-c"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "12",
    y: "12",
    width: "4",
    height: "3",
    fill: DARK
  })), /*#__PURE__*/React.createElement(MxAcc, {
    id: acc,
    fit: MX_FIT.rock,
    layer: "front"
  }));
}

/* ⑤ 小芽（幼苗）—— 好奇寶寶，開心的時候會長高一點點 */
function SproutMascot({
  size = 46,
  hat = 'none',
  acc = ''
}) {
  var SEED = '#D8C79B',
    DEEP = '#B99F6B',
    LEAF = '#6FA85A',
    STEM = '#4E7A3F',
    EYE = '#3A3222';
  return /*#__PURE__*/React.createElement("svg", {
    className: "mx-svg",
    width: size,
    height: size * 10 / 9,
    viewBox: "0 -4 18 20",
    shapeRendering: "crispEdges",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement(MxHat, {
    id: hat,
    fit: MX_FIT.sprout
  }), /*#__PURE__*/React.createElement(MxAcc, {
    id: acc,
    fit: MX_FIT.sprout,
    layer: "back"
  }), /*#__PURE__*/React.createElement("g", {
    className: "mx-stem"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "8",
    y: "0",
    width: "2",
    height: "2",
    fill: STEM
  })), /*#__PURE__*/React.createElement("g", {
    className: "mx-leaf"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "4",
    y: "0",
    width: "4",
    height: "2",
    fill: LEAF
  }), /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "1",
    width: "1",
    height: "1",
    fill: LEAF
  }), /*#__PURE__*/React.createElement("rect", {
    x: "10",
    y: "0",
    width: "4",
    height: "2",
    fill: LEAF
  }), /*#__PURE__*/React.createElement("rect", {
    x: "14",
    y: "1",
    width: "1",
    height: "1",
    fill: LEAF
  })), /*#__PURE__*/React.createElement("g", {
    className: "mx-torso"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "1",
    y: "2",
    width: "16",
    height: "2",
    fill: SEED
  }), /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: "4",
    width: "18",
    height: "8",
    fill: SEED
  }), /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: "10",
    width: "18",
    height: "2",
    fill: DEEP
  }), /*#__PURE__*/React.createElement("rect", {
    className: "mx-eye",
    x: "3",
    y: "5",
    width: "4",
    height: "4",
    fill: EYE
  }), /*#__PURE__*/React.createElement("rect", {
    className: "mx-eye",
    x: "11",
    y: "5",
    width: "4",
    height: "4",
    fill: EYE
  }), /*#__PURE__*/React.createElement("rect", {
    x: "8",
    y: "8",
    width: "2",
    height: "1",
    fill: DEEP
  })), /*#__PURE__*/React.createElement("g", {
    className: "mx-leg mx-leg-a"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: "12",
    width: "4",
    height: "4",
    fill: DEEP
  })), /*#__PURE__*/React.createElement("g", {
    className: "mx-leg mx-leg-b"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "7",
    y: "12",
    width: "4",
    height: "4",
    fill: DEEP
  })), /*#__PURE__*/React.createElement("g", {
    className: "mx-leg mx-leg-c"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "14",
    y: "12",
    width: "4",
    height: "4",
    fill: DEEP
  })), /*#__PURE__*/React.createElement(MxAcc, {
    id: acc,
    fit: MX_FIT.sprout,
    layer: "front"
  }));
}

/* ══ v455（Alan 給了一張白兔子的參考圖：奶油色身體、粉內耳、大黑眼、淺藍蝴蝶結）══
   照網站原本的像素風重畫（同一個 18×20 網格、同樣三隻腳、同樣的 .mx-torso/.mx-eye/.mx-leg-*，
   走路那十幾支現成動畫才掛得上去）。
   ⚠ 耳朵畫在 y −4~0 那一段（帽子的地盤），所以 MX_FIT.bun 的帽子要往下壓、縮小一點，
     不然帽子會蓋在耳朵上。耳朵獨立成 .mx-ear-l／.mx-ear-r，跳起來的時候會往後飄。
   ⚠ 紅蘿蔔平常 opacity:0，只有招牌動作（.act-hop）前半段才出現——見 styles-fx.css。 */
function BunnyMascot({
  size = 46,
  hat = 'none',
  acc = ''
}) {
  var FUR = '#F7EFE0',
    DEEP = '#E0D2BC',
    INNER = '#D98E72',
    EYE = '#2B2A26',
    BOW = '#CFE2F3',
    BOW_D = '#A8C6E4',
    BLUSH = '#F2B79A';
  return /*#__PURE__*/React.createElement("svg", {
    className: "mx-svg",
    width: size,
    height: size * 10 / 9,
    viewBox: "0 -4 18 20",
    shapeRendering: "crispEdges",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement(MxAcc, {
    id: acc,
    fit: MX_FIT.bun,
    layer: "back"
  }), /*#__PURE__*/React.createElement("g", {
    className: "mx-ear mx-ear-l"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "-4",
    width: "4",
    height: "6",
    fill: FUR
  }), /*#__PURE__*/React.createElement("rect", {
    x: "4",
    y: "-3",
    width: "2",
    height: "4",
    fill: INNER
  })), /*#__PURE__*/React.createElement("g", {
    className: "mx-ear mx-ear-r"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "11",
    y: "-4",
    width: "4",
    height: "6",
    fill: FUR
  }), /*#__PURE__*/React.createElement("rect", {
    x: "12",
    y: "-3",
    width: "2",
    height: "4",
    fill: INNER
  })), /*#__PURE__*/React.createElement(MxHat, {
    id: hat,
    fit: MX_FIT.bun
  }), /*#__PURE__*/React.createElement("g", {
    className: "mx-torso"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "1",
    y: "1",
    width: "16",
    height: "2",
    fill: FUR
  }), /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: "3",
    width: "18",
    height: "8",
    fill: FUR
  }), /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: "11",
    width: "18",
    height: "1",
    fill: DEEP
  }), /*#__PURE__*/React.createElement("rect", {
    className: "mx-eye",
    x: "3",
    y: "4",
    width: "4",
    height: "4",
    fill: EYE
  }), /*#__PURE__*/React.createElement("rect", {
    className: "mx-eye",
    x: "11",
    y: "4",
    width: "4",
    height: "4",
    fill: EYE
  }), /*#__PURE__*/React.createElement("rect", {
    x: "1",
    y: "7",
    width: "2",
    height: "2",
    fill: BLUSH
  }), /*#__PURE__*/React.createElement("rect", {
    x: "15",
    y: "7",
    width: "2",
    height: "2",
    fill: BLUSH
  }), /*#__PURE__*/React.createElement("rect", {
    x: "8",
    y: "6",
    width: "2",
    height: "1",
    fill: INNER
  }), /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: "9",
    width: "18",
    height: "2",
    fill: BOW
  }), /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: "10",
    width: "18",
    height: "1",
    fill: BOW_D
  }), /*#__PURE__*/React.createElement("rect", {
    x: "5",
    y: "8",
    width: "3",
    height: "4",
    fill: BOW
  }), /*#__PURE__*/React.createElement("rect", {
    x: "10",
    y: "8",
    width: "3",
    height: "4",
    fill: BOW
  }), /*#__PURE__*/React.createElement("rect", {
    x: "5",
    y: "11",
    width: "3",
    height: "1",
    fill: BOW_D
  }), /*#__PURE__*/React.createElement("rect", {
    x: "10",
    y: "11",
    width: "3",
    height: "1",
    fill: BOW_D
  }), /*#__PURE__*/React.createElement("rect", {
    x: "8",
    y: "8",
    width: "2",
    height: "4",
    fill: BOW_D
  })), /*#__PURE__*/React.createElement("g", {
    className: "mx-carrot",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "5.9",
    y: "8.5",
    width: "1.7",
    height: "1.4",
    fill: "#C96B2C"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "7.4",
    y: "8.0",
    width: "2.1",
    height: "2.4",
    fill: "#E0813C"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "9.3",
    y: "7.6",
    width: "2.4",
    height: "3.2",
    fill: "#E0813C"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "11.5",
    y: "7.2",
    width: "2.8",
    height: "4.0",
    fill: "#E0813C"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "7.4",
    y: "8.0",
    width: "2.1",
    height: "0.7",
    fill: "#F4A868"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "9.3",
    y: "7.6",
    width: "2.4",
    height: "0.8",
    fill: "#F4A868"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "11.5",
    y: "7.2",
    width: "2.8",
    height: "0.9",
    fill: "#F4A868"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "9.3",
    y: "10.1",
    width: "2.4",
    height: "0.7",
    fill: "#BF5F22"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "11.5",
    y: "10.4",
    width: "2.8",
    height: "0.8",
    fill: "#BF5F22"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "8.6",
    y: "8.4",
    width: "0.4",
    height: "1.6",
    fill: "#C96B2C"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "10.6",
    y: "8.0",
    width: "0.4",
    height: "2.4",
    fill: "#C96B2C"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "14.3",
    y: "5.2",
    width: "1.1",
    height: "2.6",
    fill: "#5E9B4B"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "15.2",
    y: "6.0",
    width: "1.6",
    height: "1.1",
    fill: "#6FAE58"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "14.3",
    y: "11.0",
    width: "1.1",
    height: "2.4",
    fill: "#5E9B4B"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "15.2",
    y: "11.6",
    width: "1.6",
    height: "1.1",
    fill: "#6FAE58"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "15.0",
    y: "7.8",
    width: "2.4",
    height: "1.2",
    fill: "#4F8540"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "14.2",
    y: "7.3",
    width: "1.4",
    height: "3.0",
    fill: "#4F8540"
  })), /*#__PURE__*/React.createElement("g", {
    className: "mx-crumbs",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("rect", {
    className: "mx-crumb mx-crumb-1",
    x: "7.0",
    y: "8.6",
    width: "1",
    height: "1",
    fill: "#E0813C"
  }), /*#__PURE__*/React.createElement("rect", {
    className: "mx-crumb mx-crumb-2",
    x: "7.2",
    y: "9.4",
    width: "0.8",
    height: "0.8",
    fill: "#F4A868"
  }), /*#__PURE__*/React.createElement("rect", {
    className: "mx-crumb mx-crumb-3",
    x: "6.6",
    y: "8.2",
    width: "0.8",
    height: "0.8",
    fill: "#C96B2C"
  })), /*#__PURE__*/React.createElement("g", {
    className: "mx-tail",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "-2.4",
    y: "8.4",
    width: "4.4",
    height: "4.4",
    rx: "2.2",
    fill: DEEP
  }), /*#__PURE__*/React.createElement("rect", {
    x: "-2",
    y: "8.8",
    width: "3.6",
    height: "3.6",
    rx: "1.8",
    fill: FUR
  }), /*#__PURE__*/React.createElement("rect", {
    x: "-1.2",
    y: "9.4",
    width: "2",
    height: "2",
    rx: "1",
    fill: "#FFFFFF"
  })), /*#__PURE__*/React.createElement("g", {
    className: "mx-leg mx-leg-a"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "2",
    y: "12",
    width: "4",
    height: "4",
    rx: "1.4",
    fill: FUR
  })), /*#__PURE__*/React.createElement("g", {
    className: "mx-leg mx-leg-b"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "7",
    y: "12",
    width: "4",
    height: "4",
    rx: "1.4",
    fill: DEEP
  })), /*#__PURE__*/React.createElement("g", {
    className: "mx-leg mx-leg-c"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "12",
    y: "12",
    width: "4",
    height: "4",
    rx: "1.4",
    fill: FUR
  })), /*#__PURE__*/React.createElement(MxAcc, {
    id: acc,
    fit: MX_FIT.bun,
    layer: "front"
  }));
}

/* ── 台詞（鼓勵為主，偶爾耍笨；不嘲諷小孩）────────────────── */
var MX_LINES = {
  hello: ['嗨！我陪你唸書 📚', '今天也要加油喔！', '我又出現了 👀', '你在唸什麼？我也想學', '長按我可以幫我取名字 ✏️'],
  correct: ['答對了 🎉', '好強！', '就是這個！', '欸你很可以耶 😎', '再來再來！'],
  wrong: ['沒關係，再試一次 💪', '差一點點！', '我剛剛也選錯 😅', '深呼吸，再看一次'],
  win: ['全部做完啦 🎊', '太神啦！', '今天的你超棒 ⭐', '我要放鞭炮了 🎆'],
  idle: ['我在散步 🚶', '腳有點酸…', '這裡風景不錯', '要不要摸摸我', '我在數格子 1、2、3…'],
  tap: ['哇！你摸到我了', '嘿嘿 😆', '再點我會轉圈喔', '好癢好癢', '我可是很忙的（其實沒有）'],
  sleep: ['💤', '呼…呼…', '睡一下下就好']
};
/* v392（D）：每個桶只有 3~5 句，連續抽到同一句的機率高達 20~33%，
   「我在散步 🚶」連講兩次會讓人以為壞掉。抽到跟上一句一樣就重抽「一次」——
   只重抽一次，桶裡只有 3 句時才不會變成死迴圈。台詞內容一個字都沒改。 */
var lastSaid = {};
/* v401：第二個參數是「現在是哪一隻夥伴」。牠自己有寫這一類的台詞就用牠的，
   沒寫就退回共用的那組（correct/wrong/win/tap 全部共用，不必每隻都重寫一遍）。 */
/* 🔴 v505（Alan：「把特效跟語音都刪掉，沒有用的功能」）：語音包整組下架，
   牠一律講自己的台詞（mxPick 本來就有「不要連講同一句」的保護）。 */
var mxLine = (k, pet) => mxPick(k, pet);
var mxPick = (k, pet) => {
  var a = pet && pet.lines && pet.lines[k] || MX_LINES[k] || MX_LINES.idle;
  var s = a[Math.floor(Math.random() * a.length)];
  if (s === lastSaid[k]) s = a[Math.floor(Math.random() * a.length)];
  lastSaid[k] = s;
  return s;
};
/* v529：萬聖節期間還沒取名字的話，顯示成 little Vampire。
   ⚠ 只是**顯示**用的，不寫進 localStorage——寫進去就等於幫他取好名字了，
     第一次取名的免費額度會被吃掉，而且 11/01 之後還會留著。 */
var MX_HW_NAME = 'little Vampire';
var MX_NAME_KEY = 'alan-mx-name';
function mxGetName() {
  try {
    return localStorage.getItem(mxKey(MX_NAME_KEY)) || '';
  } catch (e) {
    return '';
  }
}
function mxSetName(n) {
  try {
    localStorage.setItem(mxKey(MX_NAME_KEY), String(n || '').slice(0, 8));
  } catch (e) {}
}

/* v392（E）：「先去睡覺」以前只是一個 useState，重新整理就跑回來了——
   對想安靜的孩子等於這個功能不存在。存的值是「睡到哪一天」的 YYYY-MM-DD，
   寫法照抄上面的 mxGetHat/mxSetHat（含 try/catch），無痕模式讀寫失敗就當作沒設定。 */
var MX_OFF_KEY = 'alan-mx-off'; // 全站慣例前綴是 alan-*
function mxDay(plus) {
  // 跟 app.jsx 同一套算法：new Date().toISOString().slice(0,10)
  try {
    return new Date(Date.now() + (plus || 0) * 86400000).toISOString().slice(0, 10);
  } catch (e) {
    return '';
  }
}
function mxGetOff() {
  try {
    return localStorage.getItem(mxKey(MX_OFF_KEY)) || '';
  } catch (e) {
    return '';
  }
}
function mxSetOff(d) {
  try {
    if (d) localStorage.setItem(mxKey(MX_OFF_KEY), d);else localStorage.removeItem(mxKey(MX_OFF_KEY));
  } catch (e) {}
}

/* 純走位／搞笑的動作（不含答題反應）——所有夥伴共用的底牌 */
/* ══ v451（Alan：「預設的吉祥物會轉圈圈或做其他動作都改掉，改成只會一般走路，
   不然小朋友就不買動作了。其他角色的特殊技能保留，但除了特殊技能也只會一般走路」）══
   免費的動作池只剩「走路」——跳、轉圈、跳舞、翻滾這些全部變成要買（MX_SHOP 的 dance）。
   每一隻自己的招牌動作（sig）留著，那是牠的個性，不是把戲。
   ⚠ 買到的動作會自己加進池子裡（見 doAct 裡的 myActs）——這才是「買了真的有差」。 */
var MX_ACTS = ['walk'];

/* ══ v401：夥伴名冊 ══════════════════════════════════════════════════════
   acts ＝ 這一隻平常會做的事（權重就是「同一個動作寫幾次」，故意不用另一套資料結構）。
   sig  ＝ 招牌動作，只有牠會做；點牠的時候一定先做這一個（不然小朋友發現不了）。
   ⚠ 加新夥伴只要往這個陣列裡加一筆，MascotLayer 完全不用改。
   ⚠ 移動類的動作（走位）只有 walk / roll / dash 三種，寫在別的名字不會位移。
   speed ＝ 走位速度的倍率（v407）。Alan 回報「阿石沒有走很慢、小焰沒有跑很快」——
   原因是速度只看「動作」不看「是誰」：阿石的池子裡有兩個 roll（190px/s），
   比誰都快；小焰的 dash 是 300px/s，只有走路的 4.8 倍，在 1000px 寬的畫面上
   跑完要 3.3 秒，看起來就只是「走比較快」。個性要靠這個倍率才表現得出來。 */
var MX_MOVE_ACTS = ['walk', 'roll', 'dash'];
/* 每種走位的基礎速度（px / 秒），再乘上該夥伴的 speed。 */
var MX_BASE_SPEED = {
  walk: 62,
  roll: 190,
  dash: 620
};
/* 上面那些 px/秒 是以「桌機的身體大小」為準訂的；實際速度會照身體比例縮放（v414）。 */
var MX_REF_W = 50;
var MX_PETS = [{
  id: 'clay',
  speed: 1,
  zh: 'Claudius',
  tip: '陪你唸書的老夥伴',
  art: ClaudeMascot,
  sig: 'type',
  sigZh: '打電腦',
  acts: ['walk', 'walk', 'walk', 'type'],
  // v451：免費的只剩走路＋自己的招牌
  lines: {
    idle: ['我在散步 🚶', '這裡風景不錯', '要不要摸摸我', '我在數格子 1、2、3…'],
    sig: ['我在寫程式（假的）💻', '叩叩叩…好忙好忙', '我幫你把答案存起來了（沒有）']
  }
}, {
  id: 'owl',
  speed: 0.85,
  zh: '咕咕',
  tip: '眼睛很大，想的比走的多',
  art: OwlMascot,
  sig: 'read',
  sigZh: '看書',
  acts: ['walk', 'walk', 'walk', 'read', 'read'],
  // v451
  lines: {
    hello: ['咕…咕…📖', '我剛剛在看書', '嗨，一起唸書吧'],
    idle: ['這一頁我看三遍了', '書裡面有答案喔', '咕咕。'],
    sig: ['讀到好看的地方了 📖', '這句我記起來了', '再一頁就好…']
  }
}, {
  id: 'flame',
  speed: 1.15,
  zh: '小焰',
  tip: '靜不下來，跑超快',
  art: FlameMascot,
  sig: 'dash',
  sigZh: '衝刺',
  acts: ['walk', 'walk', 'dash', 'dash', 'dash'],
  // v451（衝刺是小焰的招牌，留著）
  lines: {
    hello: ['咻——！🔥', '我來了我來了', '要比賽跑步嗎'],
    idle: ['坐不住啦', '好想跑', '我很燙喔（其實不會）'],
    sig: ['咻咻咻！🔥', '你追不到我～', '再一圈！']
  }
}, {
  id: 'rock',
  speed: 0.38,
  zh: '阿石',
  tip: '慢吞吞，最愛裝石頭',
  art: RockMascot,
  sig: 'hide',
  sigZh: '裝石頭',
  /* v407：本來有兩個 roll。roll 的基礎速度是走路的 3 倍，所以「慢吞吞的阿石」
     實際上是全場移動最快的一隻——Alan 看到的就是這個。留一個 roll 當笑點就好。 */
  acts: ['walk', 'walk', 'hide', 'hide', 'hide'],
  // v451（裝石頭是阿石的招牌）
  lines: {
    hello: ['……（是一顆石頭）', '嗨，我醒了', '慢慢來就好'],
    idle: ['我在原地想事情', '好穩。', '滾一下比較快'],
    sig: ['我是石頭。', '……（假裝沒看到）', '噓，別說出去']
  }
}, {
  id: 'bun',
  speed: 1.1,
  zh: '小兔',
  tip: '吃一口紅蘿蔔，就能跳到半個螢幕高',
  art: BunnyMascot,
  sig: 'hop',
  sigZh: '吃紅蘿蔔＋跳超高',
  /* v457（Alan：「兔子只能有一種走路方式就是跳跳跳，不要做其他動作，除非我叫操作」）：
     平常就只是一路跳著走；吃紅蘿蔔＋大跳留給「點牠一下」（買到的動作還是會自己演）。 */
  acts: ['walk'],
  lines: {
    hello: ['蹦蹦！我來了 🐰', '嗨～要一起跳嗎', '我今天也想跳高高'],
    idle: ['蹦…蹦…', '鼻子癢癢的', '我在找紅蘿蔔', '耳朵聽得到你翻頁喔'],
    sig: ['卡滋卡滋…好吃 🥕', '吃飽了，看我跳！', '咻——跳到半空中啦！', '這一跳有沒有很高 😆']
  }
}, {
  id: 'sprout',
  speed: 1,
  zh: '小芽',
  tip: '好奇寶寶，開心就會長高',
  art: SproutMascot,
  sig: 'grow',
  sigZh: '長高',
  acts: ['walk', 'walk', 'grow', 'grow'],
  // v451（長高是小芽的招牌）
  lines: {
    hello: ['我今天又長高了 🌱', '嗨嗨！', '陽光好舒服'],
    idle: ['再長一點點…', '你有澆水嗎', '葉子癢癢的'],
    sig: ['長高了！🌱', '我又冒新葉子了', '再一公分就好']
  }
}];
try {
  window.__MX_PETS = MX_PETS;
} catch (e) {} // harness 用（正式站不讀它）
var MX_PET_KEY = 'alan-mx-pet';
function mxGetPet() {
  try {
    var id = localStorage.getItem(mxKey(MX_PET_KEY));
    return MX_PETS.some(p => p.id === id) ? id : MX_PETS[0].id; // 認不得就回預設，不會變成空白
  } catch (e) {
    return MX_PETS[0].id;
  }
}
function mxSetPet(id) {
  try {
    localStorage.setItem(mxKey(MX_PET_KEY), id || '');
  } catch (e) {}
}
function mxPetOf(id) {
  return MX_PETS.find(p => p.id === id) || MX_PETS[0];
}

/* ── v528 🧛 節慶換裝：畫誰，由這裡決定 ───────────────────────
   ⭐ 全站**只有這一個地方**在挑「要畫哪一隻的美術」——大夥伴、裝扮室的
     試穿圖、商店清單、夥伴圖鑑全部走這裡，所以萬聖節一掛上去就整組跟著換。
   ⚠ 只換「長相」，`pet` 物件本身（速度、招牌動作、講的話、MX_FIT 貼合）
     完全沒動——小兔還是會跳、阿石還是慢吞吞，只是變成吸血鬼版本。
   ⚠ 平常（非節慶）回傳 pet.art，等於這個函式不存在。 */
var MX_TONE = {
  clay: '#C1785A',
  owl: '#A9713F',
  flame: '#E2663C',
  rock: '#8E8C86',
  bun: '#E8A0B4',
  sprout: '#6FA04A'
};
function mxArtOf(pet) {
  var p = pet || MX_PETS[0];
  if (!(window.festIs && window.festIs('hw'))) return p.art;
  var tone = MX_TONE[p.id] || MX_TONE.clay;
  var fit = MX_FIT[p.id] || MX_FIT_DEF;
  var Vamp = props => /*#__PURE__*/React.createElement(VampireMascot, _extends({}, props, {
    tone: tone,
    fit: fit
  }));
  Vamp.displayName = 'Vampire_' + p.id;
  return Vamp;
}

/* 招牌動作要停留多久（毫秒）。走位類的不在這裡，時間是照距離算的。 */
var MX_SIG_HOLD = {
  type: 2800,
  read: 3000,
  hide: 2600,
  grow: 2600,
  hop: 3600
}; // v455：吃紅蘿蔔 1.4s ＋ 跳 2.2s

function MascotLayer() {
  var [alive, setAlive] = useFx(false); // 進站 2.5 秒後才出來，不跟載入畫面搶
  /* v392（E）：長按＝去睡覺，而且「記得住」——初始值直接讀 localStorage 的到期日 */
  var [hidden, setHidden] = useFx(() => mxGetOff() >= mxDay(0));
  var [x, setX] = useFx(24);
  var [dir, setDir] = useFx(1);
  var [act, setAct] = useFx('idle');
  var [moveMs, setMoveMs] = useFx(0);
  var [bubble, setBubble] = useFx('');
  var [wear, setWear] = useFx(() => window.mxWearOf ? window.mxWearOf(window.__mxData) : {
    hat: '',
    item: ''
  });
  var [stars, setStars] = useFx(0); // v431: 現在有幾顆星星（app.jsx 算好放 window.__mxStars）
  /* v477（Alan：「吉祥物可以再智能化一點，更像 AI，跟你的舉動互動」）：
     牠要講跟「此時此刻的你」有關的話，就得記得幾件事。
     判斷寫在 data.js 的 mxSmartLine（純邏輯、測得到），這裡只負責收集與播報。 */
  var wrongRunRef = useFxR(0); // 連錯幾題
  var lastKeyRef = useFxR(''); // 上一句講的是哪一類（同一件事不連講兩次）
  var smartAtRef = useFxR(0); // 上一次開口的時間（不要變話癆）
  var [dress, setDress] = useFx(false); // v431: 裝扮室
  var [dressTab, setDressTab] = useFx('hat');
  var [name, setName] = useFx(mxGetName());
  /* v529 🦇 蝙蝠型態（Alan：「點他會變身成 Bat，再點一次變回來」）。
     ⚠ 只存在記憶體裡，不寫 localStorage——重新整理就變回吸血鬼，
       不然小朋友哪天忘了自己按過，會以為吉祥物壞掉了。 */
  var [bat, setBat] = useFx(false);
  var hwOn = !!(window.festIs && window.festIs('hw'));
  /* 自動循環那個 effect 不會因為節慶而重建，直接引用 hwOn 會抓到舊值 → 用 ref 帶著走
     （跟 petRef／wearRef 同一個理由）。 */
  var hwOnRef = useFxR(hwOn);
  useFxE(() => {
    hwOnRef.current = hwOn;
  }, [hwOn]);
  var [petId, setPetId] = useFx(mxGetPet); // v401: 現在陪你的是哪一隻
  var [menu, setMenu] = useFx(false); // 長按叫出來的小選單
  /* v556（Alan：「按旁邊就關掉，不然每次都要按取消」）：選單開著時，按到選單以外的地方就收起來。
     ⚠ 用 pointerdown 不是 click：長按 500ms 叫出選單時，放開手指的那一下不會誤關。
     ⚠ capture 階段：選單自己有 stopPropagation，冒泡階段會收不到。 */
  useFxE(() => {
    if (!menu) return;
    var off = e => {
      if (!(e.target && e.target.closest && e.target.closest('.mx-menu'))) setMenu(false);
    };
    document.addEventListener('pointerdown', off, true);
    return () => document.removeEventListener('pointerdown', off, true);
  }, [menu]);
  var [petPick, setPetPick] = useFx(false); // v401: 夥伴圖鑑（從小選單打開）
  /* v459：長按在某些平板上真的按不出來（瀏覽器搶走）。除了攔截右鍵選單之外，
     再留一條「看得到」的路：點一下牠，旁邊會冒出一顆小小的 ⋯，五秒後自己消失。
     小朋友本來就一直在點牠，所以這顆一定會被看見，而且平常不佔畫面。 */
  var [handle, setHandle] = useFx(false);
  var handleT = useFxR(null);
  var showHandle = () => {
    setHandle(true);
    clearTimeout(handleT.current);
    handleT.current = setTimeout(() => setHandle(false), 5000);
  };
  var [drag, setDrag] = useFx(null); // 拖著走時的 {x,y}
  var timers = useFxR([]);
  var bubbleT = useFxR(null);
  var reduce = useFxR(false);
  var runRef = useFxR(0); // v392（B）：目前連對幾題（答錯歸零）
  var greetedRef = useFxR(false); // v392（C）：一個 session 只打一次招呼

  /* v392（F-4）：bubbleT 以前沒被登記進 timers，元件卸載／effect 重建時不會被清；
     順手把還掛著的泡泡收掉——進到作答畫面時泡泡就該立刻消失。 */
  var clearAll = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (bubbleT.current) {
      clearTimeout(bubbleT.current);
      bubbleT.current = null;
    }
    setBubble('');
  };
  /* v392（F-3）：跑完就把自己從 timers 移除。實測掛著 60 分鐘會累積約 1292 筆
     早就跑完的 timeout id，陣列只進不出。 */
  var later = (fn, ms) => {
    var t = setTimeout(() => {
      timers.current = timers.current.filter(x => x !== t);
      fn();
    }, ms);
    timers.current.push(t);
    return t;
  };

  /* ══ 🔴 v507（Alan：「兔子會瞬間跳上去又瞬移回來，動作沒做完；尤其被點擊的時候，
       感覺很多動作會卡在一起」）═══════════════════════════════════════════════
     真正的原因不是跳躍動畫寫壞了，是**沒有人負責「現在是誰在演」**：
     每一個開始動作的地方都各自 later(() => setAct('idle'), 自己的秒數)。
     點一下兔子 → 開始 3.6 秒的大跳、排了一個 3.6 秒後關掉的 timer；
     在牠落地前再點一下 → 又開始一次大跳、又排一個 timer，
     但**第一個 timer 還活著**，時間到就把 act 從 'hop' 改成 'idle'。
     mxHop 是 `animation: ... both`，class 一消失，transform 立刻回到 translateY(0)
     ＝ 牠在半空中瞬間掉回地面；而 hopSideways 排的橫移還在跑 ＝ 看起來像瞬移。
     （同樣的事也會發生在「走路走到一半被點」「連對五題的點頭」「拖曳放開的落地」。）
      解法：一個 ref 當號碼牌。每次開始動作就 ++，收尾的 timer 只有在
     「號碼還是我」的時候才把牠關掉——別人接手了就自己閉嘴。
     ⚠ busyUntil 保留原本的意思（正在表演），但現在由 startAct 統一維護。 */
  var actT = useFxR(null); // 目前這個動作的收尾 timer
  var actSeq = useFxR(0); // 號碼牌
  var hopT = useFxR(null); // 大跳的橫移（一次只能排一個）
  var stopActTimer = () => {
    if (actT.current) {
      clearTimeout(actT.current);
      actT.current = null;
    }
  };
  /* 開始一個動作。force＝一定要插隊（點一下、拖曳落地、做完大慶祝）。
     回傳號碼牌；被擋下來（正在表演）回 0。 */
  var startAct = (name, ms, opts) => {
    var o = opts || {};
    if (!o.force && Date.now() < busyUntil.current) return 0;
    var my = ++actSeq.current;
    stopActTimer();
    setAct(name);
    busyUntil.current = Date.now() + ms;
    actT.current = later(() => {
      actT.current = null;
      if (actSeq.current !== my) return; // 已經有新的動作接手，不要把它關掉
      busyUntil.current = 0;
      setAct('idle');
      if (o.then) o.then();
    }, ms);
    return my;
  };
  /* 走路／衝刺是 CSS transition，光清 timer 停不下來——要當場量目前的位置凍住牠，
     不然被點的時候牠會一邊跳一邊繼續滑過去。（這段邏輯本來只在「進作答畫面」用。） */
  var freezeMove = () => {
    if (hopT.current) {
      clearTimeout(hopT.current);
      hopT.current = null;
    }
    if (!moveMs) return;
    var el = slotRef.current;
    var cur = null;
    try {
      if (el) cur = new DOMMatrixReadOnly(getComputedStyle(el).transform).m41;
    } catch (e) {}
    setMoveMs(0);
    if (cur != null && isFinite(cur)) setX(Math.round(cur));
  };
  var pet = mxPetOf(petId);
  var Art = mxArtOf(pet);
  /* window.mascotCheer 與攔 playSound 的那兩個 effect 不會因為換夥伴而重建
     （deps 沒有 petId），直接引用 pet 會抓到換之前的舊值 → 用 ref 帶著走。 */
  var petRef = useFxR(pet);
  useFxE(() => {
    petRef.current = pet;
  }, [petId]);
  /* 跟 petRef 一樣的理由：掛 window.mascotCheer／攔 playSound 的那兩個 effect
     不會因為換裝而重建，直接引用 wear 會抓到換裝之前的舊值。 */
  var wearRef = useFxR(wear);
  useFxE(() => {
    wearRef.current = wear;
  }, [wear]);
  var say = (text, ms) => {
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
  var okNow = () => {
    if (window.__mxAllow === false) return false;
    if (document.hidden) return false; // v392（F-1）：切到別的分頁就停
    return !document.querySelector('.focus-btn, .mk-drill-options, .mk-overlay');
  };
  /* v392（A）：⚠「安靜」跟「消失」是兩件事——消失／出現本身就是會被眼角捕捉到的變化。
     canShow() 才決定牠在不在（沒登入／分頁切走＝真的不用畫），
     okNow() 只決定牠能不能動；作答時牠原地站著呼吸（mxBreathe 位移只有 0.6px）。 */
  var canShow = () => window.__mxAllow !== false && !document.hidden;
  var [allowed, setAllowed] = useFx(okNow());
  var [shown, setShown] = useFx(canShow());
  var [owned, setOwned] = useFx([]);
  /* v451：買到的動作（dc_* → 真正的動畫名稱）。免費的池子只有走路，這些是花星星換來的，
     自動循環與「點一下」都從這裡拿——沒買就什麼把戲都沒有。 */
  var ownedActsRef = useFxR([]);
  /* v457（Alan：「有時候跳起來會很快就降落」）：點一下開始表演之後，
     自動循環的下一輪可能剛好在半空中跑起來，setAct 一換動畫就整個重來
     ——看起來就是「跳到一半突然掉下來」。表演期間先把循環擋住。 */
  var busyUntil = useFxR(0);
  useFxE(() => {
    var map = {
      dc_wave: 'wave',
      dc_spin: 'twirl',
      dc_dance: 'party',
      dc_flip: 'flip',
      dc_moon: 'moon'
    };
    ownedActsRef.current = (window.MX_SHOP || []).filter(it => it.kind === 'dance' && window.mxHasItem && window.mxHasItem({
      owned
    }, it.id)).map(it => map[it.id]).filter(Boolean);
  }, [owned]);
  /* v431：剛買下去的那幾件先記在這裡——Firestore 的快照要一下下才回來，
     這段期間畫面就已經是「買到了」，不會閃一下又變回價錢。 */
  var pendRef = useFxR([]);
  /* 剛換上去的那一套也一樣：Firestore 的快照回來之前，先維持「按下去的樣子」，
     不然 1.5 秒的 sync 會把它蓋回舊的（畫面看起來像「按了又跳回去」）。
     6 秒還沒對上就放手（存失敗、或訪客沒有帳號可以存）。 */
  var wearPendRef = useFxR(null);
  useFxE(() => {
    var sync = () => {
      /* v392（G）：每次都回傳新陣列，setState 的參考永遠不同 → 會保證每次都重繪。
         先比對再 setState（買了東西仍會在 1.5 秒內看到，只是不再無謂重繪）。 */
      var mx = window.__mxData || {};
      var srv = window.mxOwnedList ? window.mxOwnedList(mx) : [];
      pendRef.current = pendRef.current.filter(id => srv.indexOf(id) < 0);
      var own = srv.concat(pendRef.current);
      setOwned(prev => prev.join() === own.join() ? prev : own);
      var w = window.mxWearOf ? window.mxWearOf(mx) : {
        hat: '',
        item: ''
      };
      /* v385 買過帽子、但還沒進過裝扮室的人：照舊自動幫他戴上（不然會覺得帽子不見了） */
      if (!w.hat) {
        var legacy = mxOwnedHats(),
          want = mxGetHat();
        w.hat = (legacy.indexOf(want) >= 0 ? want : legacy[0]) || '';
        if (w.hat === 'party') w.hat = 'hat_party';
        if (w.hat === 'crown') w.hat = 'hat_crown';
      }
      var pend = wearPendRef.current;
      if (pend) {
        var same = ['hat', 'item'].every(k => (w[k] || '') === (pend.wear[k] || ''));
        if (same || Date.now() - pend.t > 6000) wearPendRef.current = null;else Object.assign(w, pend.wear);
      }
      setWear(prev => prev.hat === w.hat && prev.item === w.item ? prev : w);
      setStars(prev => prev === (window.__mxStars || 0) ? prev : window.__mxStars || 0);
      // v442：名字改成跟著帳號（雲端有就用雲端的；訪客仍然只存在這台裝置）
      var cloudName = String(mx && mx.name || '').trim();
      if (cloudName) setName(prev => prev === cloudName ? prev : cloudName);
      /* v435：選著一隻沒買的夥伴（換帳號、資料怪怪的）→ 退回 Claudius，不然等於免費送 */
      var pets = window.mxOwnedPets ? window.mxOwnedPets(mx) : ['clay'];
      setPetId(prev => {
        if (pets.indexOf(prev) >= 0) return prev;
        mxSetPet('clay');
        return 'clay';
      });
    };
    sync();
    var iv = setInterval(sync, 1500);
    return () => clearInterval(iv);
  }, []);

  /* ── v431 裝扮室：買／穿／表演 ────────────────────────────────
     買賣真正寫進 Firestore 的是 app.jsx 掛上來的 window.__mxBuy／__mxWear
     （那裡才有 user.uid 與「現在有幾顆星星」）。這裡只負責畫面與說話。 */
  /* v435（Alan：「動作要再生動一點，不然幹嘛買？原本就會走路、原本就會快快走」）：
     買來的五個動作全部是**新的**動畫，不重用免費的 walk／dash／spin／dance。 */
  var MX_DANCE_ACT = {
    dc_wave: ['wave', 1600],
    dc_spin: ['twirl', 1500],
    dc_dance: ['party', 2800],
    dc_flip: ['flip', 1100],
    dc_moon: ['moon', 2800]
  };
  var hasItem = id => window.mxHasItem ? window.mxHasItem({
    owned
  }, id) : false;
  var myDances = (window.MX_SHOP || []).filter(it => it.kind === 'dance' && hasItem(it.id));
  var playDance = id => {
    var d = MX_DANCE_ACT[id] || ['party', 2000];
    if (reduce.current) {
      say('動畫關起來了，我先不動 🙂', 2400);
      return;
    }
    freezeMove();
    startAct(d[0], d[1], {
      force: true
    });
    // 表演的時候順便灑一次「你買的那個特效」——按下去有反應，才像在表演
    if (window.spawnConfetti) window.spawnConfetti({});
    var it = window.mxItemOf ? window.mxItemOf(id) : null;
    if (it) say(mxLine('sig', petRef.current) || `${it.zh}！`, 2200);
    if (window.playSound) window.playSound('pop');
  };
  /* v435：換夥伴（買到才換得了）。sig 是走位類的招牌動作就不在這裡放，會跟走路打架。 */
  var usePet = pid => {
    var p = mxPetOf(pid);
    mxSetPet(pid);
    setPetId(pid);
    setAct('idle');
    say(mxLine('hello', p), 2600);
    if (MX_MOVE_ACTS.indexOf(p.sig) < 0 && !reduce.current) {
      later(() => {
        if (startAct(p.sig, MX_SIG_HOLD[p.sig] || 1600, {
          force: true
        }) && p.sig === 'hop') hopSideways();
      }, 700);
    }
    if (window.playSound) window.playSound('pop');
  };
  var pickItem = async it => {
    // 已經有了 → 穿上／脫下（動作類就是表演一次、夥伴就是換牠）
    if (hasItem(it.id)) {
      if (it.kind === 'dance') {
        setDress(false);
        playDance(it.id);
        return;
      }
      if (it.kind === 'pet') {
        setDress(false);
        usePet(it.pet);
        return;
      }
      var off = wear[it.kind] === it.id;
      var next = off ? '' : it.id;
      var nextWear = Object.assign({}, wear, {
        [it.kind]: next
      });
      wearPendRef.current = {
        wear: nextWear,
        t: Date.now()
      };
      setWear(nextWear);
      var _r = await (window.__mxWear ? window.__mxWear(it.kind, next) : Promise.resolve({
        ok: false,
        reason: 'no-user'
      }));
      if (!_r.ok) {
        wearPendRef.current = null;
      } // 沒存成功就讓它變回去（下一次 sync）
      if (!_r.ok && _r.reason === 'no-user') {
        say('登入以後才存得起來喔', 2600);
        return;
      }
      say(off ? '先收起來' : `${it.zh}，好看嗎？`, 2200);
      return;
    }
    // 還沒有 → 用星星買
    if (stars < (it.cost || 0)) {
      say(`還差 ${((it.cost || 0) - stars).toLocaleString()} 顆星星 ⭐`, 2800);
      return;
    }
    if (!window.confirm(`要用 ${it.cost.toLocaleString()} 顆星星買「${it.zh}」嗎？`)) return;
    var r = await (window.__mxBuy ? window.__mxBuy(it.id) : Promise.resolve({
      ok: false,
      reason: 'no-user'
    }));
    if (!r.ok) {
      say(r.reason === 'no-user' ? '要先登入才能買喔' : r.reason === 'poor' ? `還差 ${(r.short || 0).toLocaleString()} 顆星星` : '沒買成功，等一下再試一次', 3000);
      return;
    }
    pendRef.current = pendRef.current.concat([it.id]);
    setOwned(prev => prev.concat([it.id]));
    setStars(prev => Math.max(0, prev - (it.cost || 0)));
    if (window.playSound) window.playSound('pop');
    if (it.kind === 'dance') {
      say(`學會${it.zh}了！`, 2600);
      setDress(false);
      playDance(it.id);
      return;
    }
    if (it.kind === 'pet') {
      say(`${it.zh} 加入了！`, 2800);
      setDress(false);
      usePet(it.pet);
      return;
    }
    var boughtWear = Object.assign({}, wear, {
      [it.kind]: it.id
    });
    wearPendRef.current = {
      wear: boughtWear,
      t: Date.now()
    };
    setWear(boughtWear);
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
  var uidRef = useFxR(null);
  useFxE(() => {
    /* v414：「減少動態」本來只在掛載時讀一次，之後改設定要重新整理才算數
       （iPad 的輔助使用很容易被開開關關）。改成掛監聽＋每秒的 tick 也順手重讀，
       開了就立刻安靜、關了就立刻活過來。 */
    var mq = null;
    var readReduce = () => {
      try {
        if (!mq) mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        reduce.current = mq.matches;
      } catch (e) {}
    };
    readReduce();
    if (mq && mq.addEventListener) mq.addEventListener('change', readReduce);
    var t = setTimeout(() => setAlive(true), 2500);
    var syncAccount = () => {
      var u = mxUid();
      if (u === uidRef.current) return;
      uidRef.current = u;
      mxMigrateOnce(); // 舊的公用設定搬給第一個登入的帳號（只做一次）
      setHidden(mxGetOff() >= mxDay(0));
      setName(mxGetName());
      setPetId(mxGetPet());
      // 帽子有自己的 4 秒同步（要跟星星商店對帳），這裡不重複處理
    };
    syncAccount();
    var tick = () => {
      readReduce();
      syncAccount();
      setAllowed(okNow());
      setShown(canShow());
    };
    var iv = setInterval(tick, 1000);
    /* v392（F-2）：切回分頁時立刻同步，不然要等最多 1 秒才醒過來 */
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearTimeout(t);
      clearInterval(iv);
      document.removeEventListener('visibilitychange', tick);
      if (mq && mq.removeEventListener) mq.removeEventListener('change', readReduce);
    };
  }, []);

  /* v392（A）：走到一半才進作答畫面怎麼辦？
     走路是 CSS transition（最長可到十幾秒），清掉 timer 也停不下來——牠會繼續
     從答案區前面滑過去。這裡讀當下真正的 transform 把牠「凍在原地」：
     先 setMoveMs(0) 拿掉 transition、再把 x 設成目前的位置，同一批 render，
     所以不會瞬移回原本的目標點。moveMs 是 0（沒在走）時完全不做事。 */
  var slotRef = useFxR(null);
  useFxE(() => {
    if (allowed) return;
    /* 立刻安靜下來——不要等下一輪 doAct（effect 重建後最久會拖到 2.3 秒，
       實測就是這樣讓一段 sleep／dance 拖進作答畫面）。
       nod／cheer／land 是「剛剛才發生的正向回饋」，不砍。 */
    actSeq.current++;
    stopActTimer();
    busyUntil.current = 0; // v507：舊動作的收尾 timer 作廢
    if (hopT.current) {
      clearTimeout(hopT.current);
      hopT.current = null;
    }
    setAct(a => a === 'nod' || a === 'cheer' || a === 'land' ? a : 'idle');
    if (!moveMs) return;
    var el = slotRef.current;
    if (!el) return;
    var cur = null;
    try {
      cur = new DOMMatrixReadOnly(getComputedStyle(el).transform).m41;
    } catch (e) {}
    setMoveMs(0);
    if (cur != null && isFinite(cur)) setX(Math.round(cur));
  }, [allowed, moveMs]);

  /* 隨機動作循環 */
  /* v459（Alan：「除了往上跳，偶爾也會往左右跳，這樣比較有趣」）：
     大跳的時候順便橫向飄一段。垂直是 mxHop 的 keyframe、水平是 .mx-slot 本來就有的
     transition——兩個疊起來就是一條拋物線，而且真的會落在新的位置（不是跳回原地）。
     時機對著 mxHop 3.6s 的 43%（起跳）到 76%（落地）。
     ⚠ 起跳位置一律從 DOM 當場量：doAct 裡的 x 是「建立這個 effect 當下」的舊值，
       拿它算方向會算反（牠會臉朝左飛向右邊）。 */
  var HOP_AIR_AT = 1480,
    HOP_AIR_MS = 1180;
  var hopSideways = () => {
    if (reduce.current) return;
    if (Math.random() < 0.4) return; // 「偶爾」＝六成的大跳會飄
    var W = Math.max(20, (window.innerWidth || 360) - 130);
    var cur = x;
    try {
      var m = new DOMMatrixReadOnly(getComputedStyle(slotRef.current).transform).m41;
      if (isFinite(m)) cur = Math.round(m);
    } catch (e) {}
    var dist = 90 + Math.random() * 120;
    var target = Math.round(cur + (Math.random() < 0.5 ? -dist : dist));
    if (target < 0 || target > W) target = Math.round(cur * 2 - target); // 快撞牆就往另一邊跳
    target = Math.max(0, Math.min(W, target));
    if (Math.abs(target - cur) < 45) return; // 太短看不出來，就乖乖直上直下
    /* v507：一次只能排一個橫移。本來連點兩下會排到兩段 transition，
       第二段從第一段的中途起跳，看起來就是「瞬移」。 */
    if (hopT.current) return;
    var my = actSeq.current;
    hopT.current = later(() => {
      hopT.current = null;
      if (actSeq.current !== my) return; // 這一跳已經被別的動作接手了
      setDir(target > cur ? 1 : -1);
      setMoveMs(HOP_AIR_MS);
      setX(target);
      later(() => {
        if (actSeq.current === my) setMoveMs(0);
      }, HOP_AIR_MS + 80);
    }, HOP_AIR_AT);
  };
  useFxE(() => {
    if (!alive || hidden || !shown) return;
    var stopped = false;

    // 右下角有「浮動頭像」等固定元件，留白不要走過去
    var maxX = () => Math.max(20, (window.innerWidth || 360) - 130);
    /* 身體現在多寬（＝ --mx-w 解析後的值）。
       ⚠ 不要用 getComputedStyle 讀 --mx-w：自訂屬性回的是沒算過的 "clamp(...)" 字串。
       直接量 .mx-body 的版面寬度最準（transform 不影響 offsetWidth）。 */
    var petW = () => bodyRef.current && bodyRef.current.offsetWidth || MX_REF_W;
    var doAct = () => {
      if (stopped) return;
      /* v392（A）：安靜模式——不走、不跳、不說話，就原地站著呼吸。
         3 秒後再檢查一次（allowed 變 true 時 effect 也會自己重建）。
         ⚠ 這裡再直接問一次 okNow()：allowed 是每秒輪詢來的，最多會慢 1 秒，
         實測就是在那 1 秒的縫隙裡漏出一個 jump。動作只有幾秒一次，
         多跑一個 querySelector 的成本遠低於「作答時牠又跳了」。
         用 functional setAct 是為了不要把「連對 5 題的點頭」或「做完的大慶祝」蓋掉。 */
      /* v457：正在表演（點一下觸發的招牌／舞蹈）就先不要插手，等牠演完再排下一個 */
      if (Date.now() < busyUntil.current) {
        later(doAct, busyUntil.current - Date.now() + 400);
        return;
      }
      if (!allowed || !okNow()) {
        setAct(a => a === 'nod' || a === 'cheer' || a === 'land' ? a : 'idle');
        later(doAct, 3000);
        return;
      }
      /* v401：動作池改成「這一隻自己的」——每隻夥伴的個性就是靠這個池子的比重表現的
         （阿石大量 hide/sleep、小焰大量 dash、咕咕大量 read/think）。 */
      /* v451：免費的池子只剩走路＋自己的招牌；**買到的動作會加進來**（一件一格），
         所以買了之後牠真的會自己表演——這就是花星星換到的東西。 */
      var bought = ownedActsRef.current || [];
      /* 🦇 v529（Alan：「原本打電腦就改掉」）：萬聖節期間整個動作池收成「走路」，
         不要讓牠自己跑去打電腦／看書／長高——這幾天牠的把戲只有一個：被點了會變蝙蝠。
         ⚠ 只是換池子，`pet.acts` 一個字都沒動，11/01 之後原樣回來。 */
      var pool = hwOnRef.current ? ['walk'] : (pet.acts && pet.acts.length ? pet.acts : MX_ACTS).concat(bought);
      var pick = reduce.current ? Math.random() < 0.5 ? 'think' : 'sleep' // 減少動態＝只做原地的小動作
      : pool[Math.floor(Math.random() * pool.length)];
      if (MX_MOVE_ACTS.indexOf(pick) >= 0) {
        var W = maxX();
        /* v407：衝刺一定跑「離自己最遠的那一端」。原本落點是隨機的，
           一半以上的衝刺只跑不到畫面的 1/3，再快也看不出來是在衝——
           小朋友看到的是「牠走得比較急」，不是「牠跑很快」。 */
        var target = pick === 'dash' ? x > W / 2 ? 0 : W : Math.round(Math.random() * W);
        var dist = Math.abs(target - x);
        if (dist < 30) {
          setAct('idle');
          later(doAct, 1200);
          return;
        }
        /* v407: 速度＝這個動作的基礎速度 × 這一隻的倍率（阿石 0.38、小焰 1.15）
           v414（Alan：「平板的動畫跟電腦不太一樣」）：再乘上「身體有多大」。
           基礎速度是絕對 px/秒，但身體會跟著畫面縮（--mx-w：桌機 50px、平板直式 38px），
           所以在平板上牠等於用「每秒 16 個身長」在跑、桌機只有 12 個——同一隻卻更毛躁。
           改成用身長計速，不管什麼裝置看起來都是同一個角色。 */
        var speed = (MX_BASE_SPEED[pick] || 62) * (pet.speed || 1) * (petW() / MX_REF_W);
        var ms = Math.max(200, Math.round(dist / speed * 1000));
        setDir(target > x ? 1 : -1);
        setMoveMs(ms);
        setX(target);
        /* v507：走位類不佔用 busyUntil（走路本來就該被點斷），但一樣要拿號碼牌——
           被點斷之後，下面這些收尾 timer 才知道「已經不是我了」要閉嘴。 */
        var myWalk = ++actSeq.current;
        var mine = () => actSeq.current === myWalk;
        stopActTimer();
        setAct(pick);
        if (Math.random() < 0.08) say(mxLine(pick === pet.sig ? 'sig' : 'idle', pet)); // v392（D）：0.25 → 0.08
        /* v407：衝刺改成「衝到底 → 煞車 → 再衝回來」。
           速度是比較出來的：中間那 0.36 秒的煞車停格就是參考點，
           有它才看得出牠剛剛橫越了整個畫面，沒有它只是一路滑過去。 */
        if (pick === 'dash') {
          var back = target === 0 ? W : 0;
          var ms2 = Math.max(200, Math.round(Math.abs(back - target) / speed * 1000));
          later(() => {
            if (!mine()) return;
            setMoveMs(0);
            setAct('skid'); // 煞車：原地滑一下、腳往前撐
            later(() => {
              if (!mine()) return;
              setDir(back > target ? 1 : -1);
              setMoveMs(ms2);
              setX(back);
              setAct('dash');
              later(() => {
                if (!mine()) return;
                setAct('idle');
                setMoveMs(0);
                later(doAct, 900 + Math.random() * 2200);
              }, ms2 + 120);
            }, 360);
          }, ms + 60);
          return;
        }
        later(() => {
          if (!mine()) return;
          setAct('idle');
          setMoveMs(0);
          later(doAct, 900 + Math.random() * 2200);
        }, ms + 120);
        return;
      }
      var HOLD = Object.assign({
        jump: 1000,
        spin: 950,
        dance: 2000,
        peek: 1700,
        sleep: 4200,
        think: 2200,
        wave: 1600,
        twirl: 1500,
        party: 2800,
        flip: 1100,
        moon: 2800
      }, MX_SIG_HOLD); // v451：買來的動作
      /* v507：doAct 開頭已經確認過沒人在演，所以這裡 force——
         真正的重點是「收尾只有一個 timer，而且認號碼牌」。 */
      startAct(pick, HOLD[pick] || 1200, {
        force: true,
        then: () => later(doAct, 1200 + Math.random() * 3000)
      });
      if (pick === 'hop') hopSideways(); // v459：小兔的大跳偶爾往左右飛
      /* v392（D）：泡泡是文字（font-weight:700、最寬 190px），比動作更會搶走視線。
         實測 1180px 是 4.50 泡泡/分鐘、390px 是 6.01 → 出現率腰斬。
         睡覺以前是「無條件講一句」，也改成一半機率。 */
      if (pick === 'sleep') {
        if (Math.random() < 0.5) say(mxLine('sleep', pet), 3800);
      }
      /* v401：招牌動作的泡泡機率拉高到 40%——它一個 session 才出現幾次，
         而且「牠在做什麼」要靠這句話才看得懂（打電腦、看書、裝石頭）。
         其他動作維持 v392 調低後的 15%，整體泡泡量不會回到當初被嫌吵的程度。 */else if (pick === pet.sig) {
        if (Math.random() < 0.4) say(mxLine('sig', pet));
      } else if (Math.random() < 0.15) say(mxLine('idle', pet)); // v392（D）：0.45 → 0.15
    };

    /* v392（C）：這個 effect 的 deps 有 allowed，而 allowed 會隨「進入／離開作答畫面」
       來回切換——以前每重跑一次就再說一次 hello，學生做完一個練習回到清單，
       700ms 後就被重新打招呼。A 做完之後切換更頻繁，所以這條必須跟 A 一起做。 */
    var first = later(() => {
      if (!greetedRef.current) {
        greetedRef.current = true;
        say(mxLine('hello', pet));
      }
      later(doAct, 1600);
    }, 700);
    return () => {
      stopped = true;
      clearTimeout(first);
      clearAll();
    };
    /* v401：deps 一定要帶 petId——換夥伴時這個 effect 不重建的話，doAct 的閉包
       抓到的還是「上一隻」的動作池與台詞。實測：從小焰換成咕咕之後，
       咕咕還在做 roll（翻滾是小焰池子裡的，咕咕沒有）。 */
  }, [alive, hidden, shown, allowed, petId]);

  /* v477：看情況說一句。有話講就講（並做對應的動作）、回 true；
     沒有特別的事就回 false，讓呼叫端照原本的固定台詞走。
     ⚠ 兩句之間至少隔 25 秒——「很懂你」跟「很吵」只差在頻率。 */
  var smartSay = (extra, minGap) => {
    try {
      if (!window.mxSmartLine) return false;
      if (Date.now() - smartAtRef.current < (minGap == null ? 25000 : minGap)) return false;
      var cheapest = (window.MX_SHOP || []).filter(it => it && it.cost > stars && !(window.mxHasItem && window.mxHasItem({
        owned
      }, it.id))).sort((x, y) => x.cost - y.cost)[0];
      var line = window.mxSmartLine(Object.assign({
        stars,
        nearBuy: cheapest ? {
          label: `${cheapest.emoji || ''}${cheapest.zh || cheapest.name || ''}`.trim(),
          need: cheapest.cost - stars
        } : null,
        wrongRun: wrongRunRef.current,
        hour: new Date().getHours(),
        lastKey: lastKeyRef.current
      }, window.__mxCtx || {}, extra || {}));
      if (!line) return false;
      lastKeyRef.current = line.key;
      smartAtRef.current = Date.now();
      if (line.act) startAct(line.act, 1800);
      say(line.text, 3000);
      return true;
    } catch (e) {
      return false;
    }
  };

  /* 答題反應——攔 playSound，全站不用改任何一行就有反應 */
  useFxE(() => {
    if (!alive || hidden || !shown) return; // ⚠ 不看 allowed：答題本來就發生在作答畫面裡
    var orig = window.playSound;
    if (!orig || orig.__mx) return;
    /* v392（B）：以前是每一題擲一次骰子（對 45% 跳＋泡泡、錯 45% 抖＋泡泡）。
       跑 200000 次模擬（20 題、正確率 80%）：平均每份被打斷 9.0 次，
       等於每 2.2 題就跳一次。答錯那條特別該拿掉——小朋友答錯的當下
       最不需要旁邊有東西抖一下。改成「連對 5 題」才回應一次，
       而且反應降級成 3px 的點頭（不是位移 13px 的 jump），也不出泡泡。
       同樣條件下打斷次數 9.0 → 1.7 次/份，而且每一次都真的代表「你連對 5 題」。
       runRef 是 useRef，effect 因 allowed/shown 變動重建時不會被重置，行為正確。 */
    var patched = function (type) {
      try {
        orig.apply(this, arguments);
      } catch (e) {}
      try {
        if (type === 'correct') {
          runRef.current++;
          wrongRunRef.current = 0;
          // v477：連對 5／10 題這種「正在發生的事」自己會講，不受語音包有沒有買影響
          if (runRef.current >= 5 && runRef.current % 5 === 0 && smartSay({
            streak: runRef.current
          })) return;
          /* v457：正在表演（點一下觸發的大跳／舞蹈）就不要插隊點頭——
             一換動畫，CSS 動畫整個重來，看起來就是「跳到一半掉下來」。 */
          if (runRef.current % 5 === 0) startAct('nod', 620);
        } else if (type === 'wrong') {
          runRef.current = 0; // 答錯＝連勝歸零
          wrongRunRef.current++;
          /* ⚠ 答錯的當下本來就不該有東西抖一下（v392 的教訓）。
             只有「連錯三題」才開口，而且是安慰不是提醒。 */
          if (wrongRunRef.current >= 3 && wrongRunRef.current % 3 === 0) smartSay({
            wrongRun: wrongRunRef.current
          }, 60000);
        } else if (type === 'complete' || type === 'fanfare') {
          // 做完了本來就該有大慶祝——這條維持不動（但表演到一半就等牠演完）
          var wait = Math.max(0, busyUntil.current - Date.now());
          later(() => {
            // v477：做完一份之後，如果「只剩一個就整組完成」之類的事成立，就講那件事
            if (smartSay({}, 0)) return;
            startAct('cheer', 2200, {
              force: true
            });
            say(mxLine('win', petRef.current), 3000);
          }, wait);
        }
      } catch (e) {}
    };
    patched.__mx = true;
    window.playSound = patched;
    return () => {
      if (window.playSound === patched) window.playSound = orig;
    };
  }, [alive, hidden, shown]);

  /* 給外面用的小 API */
  useFxE(() => {
    /* v431：商店（StarsPanel）按「去裝扮室」會叫這個；牠在睡覺就順便叫醒 */
    window.mxOpenDress = () => {
      mxSetOff('');
      setHidden(false);
      setDress(true);
    };
    window.mascotSay = t => say(String(t || ''), 2600);
    window.mascotDo = a => {
      startAct(a, 1600, {
        force: true
      });
    };
    window.mascotCheer = () => {
      startAct('cheer', 2200, {
        force: true
      });
      say(mxLine('win', petRef.current), 3000);
    };
  }, []);

  /* 點一下＝耍寶；長按＝去睡覺（這次不再出現）。
     ⚠ 牠會走到按鈕上面——所以點到牠的時候，先看看牠腳下是不是按鈕：
     是的話就把這一下讓給按鈕（吉祥物絕不會吃掉小朋友的作答）。 */
  var pressT = useFxR(null);
  var longRef = useFxR(false);
  var bodyRef = useFxR(null);
  var startRef = useFxR(null);
  var movedRef = useFxR(false);
  var pressedRef = useFxR(false); // ⚠ 一定要有：不然放開之後滑鼠只是「移過去」也會被當成拖曳
  var onDown = e => {
    longRef.current = false;
    movedRef.current = false;
    pressedRef.current = true;
    startRef.current = {
      x: e.clientX,
      y: e.clientY
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {}
    // 長按＝叫出小選單（取名字／去睡覺）
    // v459：650 → 500，要趕在 Android 瀏覽器自己的長按選單（約 500ms）之前先開
    pressT.current = setTimeout(() => {
      if (!movedRef.current) {
        longRef.current = true;
        setMenu(true);
      }
    }, 500);
  };
  /* v384: 拖著走。小朋友最愛的就是這個，而且完全不吵——放開會掉回地上彈一下。 */
  var onMove = e => {
    if (!pressedRef.current || !startRef.current) return; // 沒按著就不理它
    var dx = e.clientX - startRef.current.x,
      dy = e.clientY - startRef.current.y;
    if (!movedRef.current && Math.abs(dx) + Math.abs(dy) < 8) return;
    movedRef.current = true;
    clearTimeout(pressT.current);
    setDrag({
      x: e.clientX,
      y: e.clientY
    });
  };
  var endDrag = () => {
    pressedRef.current = false;
    startRef.current = null;
    if (!movedRef.current) return;
    var d = drag;
    setDrag(null);
    if (d) {
      var maxX = Math.max(20, (window.innerWidth || 360) - 130);
      setX(Math.max(0, Math.min(maxX, Math.round(d.x - 23))));
      setMoveMs(0);
    }
    startAct('land', 620, {
      force: true
    });
    if (window.playSound) window.playSound('pop');
  };
  var onUp = e => {
    clearTimeout(pressT.current);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {}
    var wasDrag = movedRef.current;
    pressedRef.current = false;
    startRef.current = null;
    if (wasDrag) {
      endDrag();
      return;
    }
    if (longRef.current) return;
    var el = bodyRef.current;
    if (el && e && e.clientX != null) {
      var prev = el.style.pointerEvents;
      el.style.pointerEvents = 'none';
      var under = document.elementFromPoint(e.clientX, e.clientY);
      el.style.pointerEvents = prev;
      var hit = under && under.closest && under.closest('button, a, input, select, textarea, label, [role="button"]');
      if (hit) {
        hit.click();
        return;
      } // 腳下是按鈕 → 這一下算按鈕的，不耍寶
    }
    showHandle(); // v459：點一下就露出「⋯」——長按按不出來的平板也有路可走
    /* v401：點一下就做招牌動作——招牌動作在自動循環裡幾分鐘才輪到一次，
       小朋友不會等那麼久，「點牠就會表演」才是他們發現這件事的方式。
       v457（Alan：「按下兔子的時候他只說了『休～』卻沒跳起來」）：
       本來只有 45% 機率，另外 55% 只是點個頭＝看起來像壞掉。改成**一定會表演**：
       招牌動作與「買到的動作」一起抽（招牌權重 2），沒有招牌也沒買動作才點頭。
       ⚠ 走位類的招牌（小焰的 dash）不能在這裡做：這裡不設定 moveMs/x，
         套上去只會原地抽動，所以那一隻退回買來的動作或點頭。 */
    /* 🔴 v507（Alan：「動作沒做完…尤其是被點擊的時候，感覺很多動作會卡在一起」）
       正在表演就**不要重新開始**——只回一句話。
       以前每點一下就重排一次收尾 timer，前一個 timer 時間到照樣把 act 改成 'idle'，
       `animation: … both` 的 class 一消失，牠就在半空中瞬間掉回地面。 */
    if (Date.now() < busyUntil.current) {
      say(mxLine('tap', pet), 1800);
      if (window.playSound) window.playSound('match');
      return;
    }
    freezeMove(); // 走到一半被點：先把牠停在當下的位置，不要一邊跳一邊滑走

    /* 🦇 v529：萬聖節期間，「點一下」整個換成變身（Alan 指定；原本的打電腦拿掉）。
       ⚠ 這裡**直接 return**，不要讓它接著跑下面的招牌動作抽籤——
         不然會變成「一邊變身一邊打電腦」，兩個動畫疊在一起。 */
    if (hwOn) {
      var toBat = !bat;
      setBat(toBat);
      startAct('twirl', 700, {
        force: true
      }); // 轉一圈當作變身的過場
      say(toBat ? '變成蝙蝠！🦇' : '變回來了 🧛', 2000);
      if (window.playSound) window.playSound('pop');
      return;
    }
    var sigOk = !reduce.current && pet.sig && MX_MOVE_ACTS.indexOf(pet.sig) < 0;
    var boughtActs = ownedActsRef.current || [];
    var picks = (sigOk ? [pet.sig, pet.sig] : []).concat(reduce.current ? [] : boughtActs);
    if (picks.length) {
      var t2 = picks[Math.floor(Math.random() * picks.length)];
      var isSig = t2 === pet.sig;
      var HOLD_TAP2 = {
        wave: 1600,
        twirl: 1500,
        party: 2800,
        flip: 1100,
        moon: 2800
      };
      startAct(t2, MX_SIG_HOLD[t2] || HOLD_TAP2[t2] || 1600, {
        force: true
      });
      if (t2 === 'hop') hopSideways(); // v459
      say(mxLine(isSig ? 'sig' : 'tap', pet), 2400);
      if (window.playSound) window.playSound('match');
      return;
    }
    /* v451：點一下不再免費送「跳／轉圈／跳舞／翻滾」。
       走到這裡＝這一隻沒有原地招牌（小焰）又還沒買動作，就只是點個頭。 */
    var t = reduce.current ? 'think' : 'nod';
    startAct(t, t === 'think' ? 1600 : 620, {
      force: true
    });
    say(mxLine('tap', pet), 2000);
    if (window.playSound) window.playSound('match');
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
    return /*#__PURE__*/React.createElement("div", {
      className: "mx-layer"
    }, /*#__PURE__*/React.createElement("button", {
      className: "mx-wake",
      title: "\u628A\u5925\u4F34\u53EB\u56DE\u4F86",
      "aria-label": "\u628A\u5925\u4F34\u53EB\u56DE\u4F86",
      onClick: () => {
        mxSetOff(''); // 清掉「休息到哪一天」
        setHidden(false);
        greetedRef.current = false; // 讓牠回來時重新打一次招呼
        if (window.playSound) window.playSound('pop');
      }
    }, "\uD83D\uDCA4"));
  }
  var slotStyle = drag ? {
    transform: 'none',
    transition: 'none',
    left: drag.x - 23 + 'px',
    bottom: 'auto',
    top: drag.y - 20 + 'px',
    position: 'fixed'
  } : {
    transform: `translateX(${x}px)`,
    transition: moveMs ? `transform ${moveMs}ms linear` : 'none'
  };
  return /*#__PURE__*/React.createElement("div", {
    className: 'mx-layer' + (drag ? ' dragging' : '')
  }, /*#__PURE__*/React.createElement("div", {
    ref: slotRef,
    className: "mx-slot",
    style: slotStyle
  }, bubble && !menu && !petPick && /*#__PURE__*/React.createElement("div", {
    className: 'mx-bubble' + (act === 'grow' ? ' mx-bubble-high' : '') + (act === 'hop' ? ' mx-bubble-hop' : '')
  }, bubble), /*#__PURE__*/React.createElement("div", {
    ref: bodyRef,
    className: 'mx-body pet-' + petId + ' act-' + act + (hwOn ? bat ? ' is-bat' : ' is-vamp' : ''),
    style: {
      '--mx-dir': dir
    },
    onPointerDown: onDown,
    onPointerMove: onMove,
    onPointerUp: onUp,
    onPointerCancel: () => {
      clearTimeout(pressT.current);
      endDrag();
    }
    /* v459（Alan：「有學生的平板不是 iPad，長按會跳出網站的設定」）：
       Android／Windows 的瀏覽器長按會自己彈出右鍵選單，把我們的長按吃掉。
       這裡不只是擋掉它——順手把它當成「這個人正在長按」，直接開我們的選單。
       所以在那些平板上長按一樣會叫出取名字／裝扮室，而不是瀏覽器的設定。 */,
    onContextMenu: e => {
      e.preventDefault();
      if (movedRef.current) return;
      clearTimeout(pressT.current);
      longRef.current = true;
      setMenu(true);
      if (window.playSound) window.playSound('pop');
    },
    role: "img",
    "aria-label": `吉祥物 ${name || (hwOn ? MX_HW_NAME : pet.zh)}`
  }, /*#__PURE__*/React.createElement(Art, {
    hat: hwOn || bat ? 'none' : wear.hat || 'none',
    acc: hwOn || bat ? '' : wear.item,
    bat: bat
  }), /*#__PURE__*/React.createElement("span", {
    className: "mx-trail",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null)), /*#__PURE__*/React.createElement("span", {
    className: "mx-dust",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null))), handle && !menu && !dress && !petPick && /*#__PURE__*/React.createElement("button", {
    className: "mx-handle",
    title: "\u6253\u958B\u5925\u4F34\u9078\u55AE",
    "aria-label": "\u6253\u958B\u5925\u4F34\u9078\u55AE",
    onPointerDown: e => e.stopPropagation(),
    onClick: e => {
      e.stopPropagation();
      setHandle(false);
      setMenu(true);
      if (window.playSound) window.playSound('pop');
    }
  }, "\u22EF")), menu && /*#__PURE__*/React.createElement("div", {
    className: "mx-menu",
    onPointerDown: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "mx-menu-name"
  }, name || (hwOn ? MX_HW_NAME : '還沒有名字')), /*#__PURE__*/React.createElement("button", {
    onClick: async () => {
      setMenu(false);
      var cost = window.mxRenameCost ? window.mxRenameCost(window.__mxData) : 0;
      if (cost && stars < cost) {
        say(`改名要 ${cost} 顆星星，還差 ${cost - stars} 顆`, 3000);
        return;
      }
      if (cost && !window.confirm(`改名字要用 ${cost} 顆星星（第一次取名是免費的），要改嗎？`)) return;
      var n = window.prompt(cost ? `幫牠改名字（最多 8 個字）· 這次要 ${cost} 顆星星` : '幫牠取個名字（最多 8 個字）', name || '');
      if (n === null) return;
      var nm = n.trim().slice(0, 8);
      if (!nm) {
        say('名字不能空白喔', 2200);
        return;
      }
      var r = await (window.__mxRename ? window.__mxRename(nm) : Promise.resolve({
        ok: false,
        reason: 'no-user'
      }));
      if (!r.ok) {
        if (r.reason === 'no-user') {
          mxSetName(nm);
          setName(nm);
          say(`我叫 ${nm}！`, 2600);
          return;
        } // 訪客：只存這台裝置
        say(r.reason === 'poor' ? `還差 ${r.short || 0} 顆星星` : '改名沒成功，等一下再試', 2800);
        return;
      }
      mxSetName(nm);
      setName(nm);
      setStars(v => Math.max(0, v - (r.cost || 0)));
      say(r.cost ? `我現在叫 ${nm} 了！（用了 ${r.cost} 顆星星）` : `我叫 ${nm}！`, 3000);
    }
  }, window.mxRenameCost && window.mxRenameCost(window.__mxData) ? '✏️ 改名字（50⭐）' : '✏️ 取名字'), !hwOn && /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setMenu(false);
      setDress(true);
    }
  }, "\uD83D\uDC55 \u88DD\u626E\u5BA4"), !hwOn && myDances.length > 0 && /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setMenu(false);
      playDance(myDances[Math.floor(Math.random() * myDances.length)].id);
    }
  }, "\uD83D\uDC83 \u8868\u6F14\u4E00\u500B"), !hwOn && /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setMenu(false);
      setPetPick(true);
    }
  }, "\uD83D\uDC3E \u63DB\u5925\u4F34"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setMenu(false);
      mxSetOff(mxDay(0));
      setHidden(true);
    }
  }, "\uD83D\uDCA4 \u4F11\u606F\u4E00\u4E0B\uFF08\u4ECA\u5929\uFF09"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setMenu(false);
      mxSetOff(mxDay(1));
      setHidden(true);
    }
  }, "\uD83D\uDE34 \u660E\u5929\u4E5F\u4E0D\u8981"), /*#__PURE__*/React.createElement("div", {
    className: "mx-menu-hint"
  }, "\u7761\u8457\u5F8C\u9EDE\u89D2\u843D\u7684 \uD83D\uDCA4 \u5C31\u80FD\u53EB\u56DE\u4F86"), /*#__PURE__*/React.createElement("button", {
    className: "mx-menu-x",
    onClick: () => setMenu(false)
  }, "\u53D6\u6D88")), dress && ReactDOM.createPortal(/*#__PURE__*/React.createElement("div", {
    className: "mx-dress-back",
    onPointerDown: e => {
      if (e.target === e.currentTarget) setDress(false);
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "mx-dress",
    style: {
      pointerEvents: 'auto'
    },
    onPointerDown: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "mx-dress-head"
  }, /*#__PURE__*/React.createElement("b", null, "\uD83D\uDC55 \u88DD\u626E\u5BA4"), /*#__PURE__*/React.createElement("span", {
    className: "mx-dress-bal"
  }, stars.toLocaleString(), " \u2B50"), /*#__PURE__*/React.createElement("button", {
    className: "mx-dress-x",
    onClick: () => setDress(false),
    "aria-label": "\u95DC\u8D77\u4F86"
  }, "\u2715")), /*#__PURE__*/React.createElement("div", {
    className: "mx-dress-prev",
    onClick: () => myDances.length && playDance(myDances[0].id)
  }, /*#__PURE__*/React.createElement("span", {
    className: "mx-dress-figure"
  }, /*#__PURE__*/React.createElement(Art, {
    size: 62,
    hat: hwOn ? 'none' : wear.hat || 'none',
    acc: hwOn ? '' : wear.item
  })), /*#__PURE__*/React.createElement("span", {
    className: "mx-dress-who"
  }, name || (hwOn ? MX_HW_NAME : pet.zh))), /*#__PURE__*/React.createElement("div", {
    className: "mx-dress-tabs"
  }, (window.MX_KINDS || []).map(k => /*#__PURE__*/React.createElement("button", {
    key: k.kind,
    className: dressTab === k.kind ? 'on' : '',
    onClick: () => setDressTab(k.kind)
  }, k.ico, " ", k.zh))), /*#__PURE__*/React.createElement("div", {
    className: "mx-dress-grid"
  }, (window.MX_SHOP || []).filter(it => it.kind === dressTab).map(it => {
    var have = hasItem(it.id);
    var on = have && (it.kind === 'pet' ? it.pet === petId : it.kind === 'dance' ? false : wear[it.kind] === it.id);
    /* v505（Alan：「圖片要是本人的照片啦，比較好看」）：夥伴那一格畫牠本人，
       不要用 🪨🌱🦉 這種代打的 emoji——牠長什麼樣子本來就畫得出來。 */
    var PetArt = it.kind === 'pet' ? mxArtOf(MX_PETS.find(p => p.id === it.pet)) : null;
    return /*#__PURE__*/React.createElement("button", {
      key: it.id,
      className: 'mx-dz' + (have ? ' have' : '') + (on ? ' on' : '') + (PetArt ? ' mx-dz-pet' : ''),
      onClick: () => pickItem(it)
    }, /*#__PURE__*/React.createElement("span", {
      className: "mx-dz-ico"
    }, PetArt ? /*#__PURE__*/React.createElement(PetArt, {
      size: 38
    }) : it.emoji), /*#__PURE__*/React.createElement("span", {
      className: "mx-dz-name"
    }, it.zh), /*#__PURE__*/React.createElement("span", {
      className: "mx-dz-tag"
    }, !have ? `${it.cost.toLocaleString()}⭐` : it.kind === 'dance' ? '表演' : it.kind === 'pet' ? on ? '陪你中' : '換牠' : on ? '穿著中' : '穿上'));
  })), /*#__PURE__*/React.createElement("div", {
    className: "mx-dress-note"
  }, dressTab === 'dance' ? '買了之後，長按牠就可以叫牠表演 💃' : dressTab === 'pet' ? 'Claudius 一開始就在；其他夥伴要用星星請牠來 🐾' : '星星是做練習賺來的；買了以後隨時可以換 · 再按一次可以脫下來'), /*#__PURE__*/React.createElement("button", {
    className: "mx-menu-x",
    onClick: () => setDress(false)
  }, "\u95DC\u8D77\u4F86"))), document.body), petPick && /*#__PURE__*/React.createElement("div", {
    className: "mx-pets",
    onPointerDown: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "mx-menu-name"
  }, "\u9078\u4E00\u500B\u5925\u4F34\u966A\u4F60"), MX_PETS.map(p => {
    var PArt = mxArtOf(p);
    /* v435：Claudius 以外都要用星星請來——沒買的顯示價錢，按下去就是買 */
    var shopIt = window.mxPetItem ? window.mxPetItem(p.id) : null;
    var have = !shopIt || hasItem(shopIt.id);
    return /*#__PURE__*/React.createElement("button", {
      key: p.id,
      className: 'mx-pet-row' + (p.id === petId ? ' on' : '') + (have ? '' : ' locked'),
      onClick: () => {
        if (!have) {
          setPetPick(false);
          pickItem(shopIt);
          return;
        }
        setPetPick(false);
        usePet(p.id);
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "mx-pet-ico"
    }, /*#__PURE__*/React.createElement(PArt, {
      size: 30
    })), /*#__PURE__*/React.createElement("span", {
      className: "mx-pet-txt"
    }, /*#__PURE__*/React.createElement("b", null, p.zh, p.id === petId && /*#__PURE__*/React.createElement("em", null, " \xB7 \u73FE\u5728")), /*#__PURE__*/React.createElement("span", null, p.tip, " \xB7 \u6703", p.sigZh)), !have && /*#__PURE__*/React.createElement("span", {
      className: "mx-pet-cost"
    }, shopIt.cost.toLocaleString(), "\u2B50"));
  }), /*#__PURE__*/React.createElement("button", {
    className: "mx-menu-x",
    onClick: () => setPetPick(false)
  }, "\u95DC\u8D77\u4F86")));
}

/* ── 彩帶 ─────────────────────────────────────────────────── */
var FX_COLORS = ['#C1785A', '#C9A84C', '#2E7D5B', '#2E6F9E', '#8A5FA8', '#D6533C', '#E8C86A'];
function ConfettiBurst({
  big,
  onDone
}) {
  var chars = useFxR(null).current; // v505：特效商品下架，答對一律灑原本的彩帶紙片
  var pieces = useFxR(Array.from({
    length: big ? 84 : 26
  }, (_, i) => ({
    // 沒達標時只放一點點（是「你做完了」不是「你贏了」）
    id: i,
    left: Math.random() * 100,
    color: FX_COLORS[Math.floor(Math.random() * FX_COLORS.length)],
    delay: Math.round(Math.random() * 420),
    dur: Math.round(1500 + Math.random() * 1400),
    w: Math.round(6 + Math.random() * 6),
    h: Math.round(9 + Math.random() * 9),
    spin: Math.round((Math.random() - 0.5) * 900),
    drift: Math.round((Math.random() - 0.5) * 180),
    round: Math.random() < 0.3,
    ch: chars ? chars[Math.floor(Math.random() * chars.length)] : null
  }))).current;
  useFxE(() => {
    var t = setTimeout(() => onDone && onDone(), big ? 3400 : 2800);
    return () => clearTimeout(t);
  }, []);
  return /*#__PURE__*/React.createElement("div", {
    className: "fx-confetti",
    "aria-hidden": "true"
  }, pieces.map(p => /*#__PURE__*/React.createElement("span", {
    key: p.id,
    className: 'fx-cfp' + (p.ch ? ' fx-cfp-ch' : ''),
    style: {
      left: p.left + '%',
      background: p.ch ? 'none' : p.color,
      width: p.ch ? 'auto' : p.w + 'px',
      height: p.ch ? 'auto' : p.h + 'px',
      fontSize: p.ch ? p.h + 9 + 'px' : undefined,
      borderRadius: p.round ? '50%' : '1px',
      animationDelay: p.delay + 'ms',
      animationDuration: p.dur + 'ms',
      '--fx-spin': p.spin + 'deg',
      '--fx-drift': p.drift + 'px'
    }
  }, p.ch)));
}
function FxLayer() {
  var [bursts, setBursts] = useFx([]);
  var seq = useFxR(0);
  useFxE(() => {
    window.spawnConfetti = opts => {
      var id = ++seq.current;
      setBursts(b => b.length > 2 ? b : b.concat({
        id,
        big: !!(opts && opts.big)
      }));
    };
  }, []);
  return /*#__PURE__*/React.createElement(React.Fragment, null, bursts.map(b => /*#__PURE__*/React.createElement(ConfettiBurst, {
    key: b.id,
    big: b.big,
    onDone: () => setBursts(list => list.filter(x => x.id !== b.id))
  })), /*#__PURE__*/React.createElement(MascotLayer, null));
}

/* v402：mxGetPet／mxPetOf 給 app.jsx 的登出過場用（要畫「現在這一隻」跟你說再見）*/
Object.assign(window, {
  ClaudeMascot,
  OwlMascot,
  FlameMascot,
  RockMascot,
  SproutMascot,
  MX_PETS,
  mxGetPet,
  mxPetOf,
  MascotLayer,
  FxLayer,
  ConfettiBurst,
  /* v435：裝扮的繪圖元件也開放出來——校稿／對照表（scratchpad/site/_fit.html）要能一次畫出
     「五隻 × 每一件」，不然只能一個一個換來換去看。 */
  MxHat,
  MxAcc,
  MX_FIT,
  VampireMascot,
  BatForm
});

/* 自己掛載——不動 App 的樹，任何頁面都在 */
(function mountFx() {
  try {
    var host = document.createElement('div');
    host.id = '__fx-root';
    document.body.appendChild(host);
    ReactDOM.createRoot(host).render(/*#__PURE__*/React.createElement(FxLayer, null));
  } catch (e) {/* 特效掛不上去也不能影響主程式 */}
})();