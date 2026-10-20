/* t-v507 — 吉祥物三件：動作打架、裝扮試穿、紅蘿蔔與跳躍
 *
 * Alan（⑥）：「兔子有一個 bug，他會瞬間跳上去又瞬移回來，動作沒做完，
 *   尤其是被點擊的時候，感覺很多動作會卡在一起，導致 bug 產生。」
 *
 * 🔴 真正的原因不是跳躍動畫寫壞了，是**沒有人負責「現在是誰在演」**：
 *   每一個開始動作的地方都各自排一個 later(() => setAct('idle'), 自己的秒數)。
 *   點一下兔子 → 開始 3.6 秒的大跳、排了一個 3.6 秒後關掉的 timer；
 *   還沒落地再點一下 → 又開始一次、又排一個，但**第一個 timer 還活著**，
 *   時間到就把 act 從 'hop' 改成 'idle'。mxHop 是 `animation: … both`，
 *   class 一消失 transform 立刻回到 translateY(0)＝半空中瞬間掉回地面；
 *   而 hopSideways 排的橫移還在跑＝看起來像瞬移。
 *
 * Alan（⑤）：「所有頭飾和配件都要試穿到每個吉祥物身上試穿，並且客製化才行，
 *   跟著縮放比例以及動態效果。」
 * Alan（⑦）：「兔子吃紅蘿蔔特效再做逼真一點，以及跳躍動畫也是。」
 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const fx  = fs.readFileSync(new URL('components-fx.jsx', ROOT), 'utf8');
const css = fs.readFileSync(new URL('styles-fx.css', ROOT), 'utf8');
const fxNoC  = fx.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const cssNoC = css.replace(/\/\*[\s\S]*?\*\//g, '');

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };

console.log('\n【1】⑥ 只有一個地方可以「開始一個動作」');
ok('⭐ 有 startAct（統一設 act、設 busyUntil、排唯一一個收尾 timer）',
   /const startAct = \(name, ms, opts\) => \{/.test(fx));
ok('⭐ 開始新動作前先把上一個收尾 timer 清掉', /stopActTimer\(\);\s*\n\s*setAct\(name\);/.test(fx));
ok('⭐⭐ 收尾 timer 認號碼牌——別人接手了就自己閉嘴（這一條就是那個 bug 的解）',
   /const my = \+\+actSeq\.current;/.test(fx) && /if \(actSeq\.current !== my\) return;/.test(fx));
ok('⭐ 正在表演時「點一下」只講話，不重新開始動作（Alan：動作沒做完）',
   /if \(Date\.now\(\) < busyUntil\.current\) \{\s*\n\s*say\(mxLine\('tap'/.test(fx));
ok('   沒有任何地方還在自己排 later(() => setAct(\'idle\'), …)',
   !/later\(\(\) => setAct\('idle'\)/.test(fxNoC));
ok('⭐ 走路／衝刺的收尾也要認號碼牌（走到一半被點，走路的 timer 不能把大跳關掉）',
   /const mine = \(\) => actSeq\.current === myWalk;/.test(fx)
   && (fx.match(/if \(!mine\(\)\) return;/g) || []).length >= 4);
ok('⭐ 被點斷時先把走路凍在當下的位置（不然會一邊跳一邊滑走）', (() => {
   /* ⚠ 本來釘「freezeMove 之後 120 字內要出現 const sigOk」——那是在釘
      *程式長什麼樣*。v529 在中間插了「變身成蝙蝠」的分支就失敗了，但行為完全正確。
      真正要守的是：**點一下的處理裡，freezeMove 要排在任何 startAct 前面**。 */
   if (!/const freezeMove = \(\) => \{/.test(fx)) return false;
   const a = fx.indexOf('const onUp = (e) => {');
   const body = fx.slice(a, fx.indexOf('\n  const ', a + 30));
   const f = body.indexOf('freezeMove();');
   const firstAct = body.indexOf('startAct(');
   return f > 0 && firstAct > f; })());
ok('⭐ 一次只能排一個橫移（連點兩下本來會疊成兩段 transition＝瞬移）',
   /if \(hopT\.current\) return;/.test(fx));
ok('   橫移也認號碼牌（這一跳被接手就不要飛出去）',
   /hopT\.current = later\([\s\S]{0,200}if \(actSeq\.current !== my\) return;/.test(fx));
ok('   進作答畫面／切走分頁時，舊動作的收尾 timer 要作廢',
   /actSeq\.current\+\+; stopActTimer\(\); busyUntil\.current = 0;/.test(fx));

console.log('\n【2】⑤ 裝扮：每一隻都要能客製化，而且要跟著動');
ok('⭐ 帽子可以針對「這一隻 × 這一頂」微調（本來八頂吃同一組設定）',
   /function mxFitHat\(fit, key\) \{/.test(fx) && /fit\.hats && fit\.hats\[key\]/.test(fx));
ok('⭐ 配件也可以（dx／dy／縮放，繞著身體中心）',
   /fit\.accs && fit\.accs\[id\]/.test(fx) && /scale\(\$\{ov\.s != null \? ov\.s : 1\}\)/.test(fx));
ok('   沒特別寫的照基準走（大部分組合一行設定都不用）',
   /if \(!ov\) return base;/.test(fx));
ok('🔴 小兔的帽子要畫在耳朵前面（畫在後面會被兩隻耳朵切成三片）', (() => {
   const i = fx.indexOf('function BunnyMascot('), j = fx.indexOf('\n}\n', i);
   const art = fx.slice(i, j);
   return art.indexOf('mx-ear') > 0 && art.indexOf('<MxHat') > art.indexOf('mx-ear'); })());
ok('⭐⭐ 帽子不可以自己再跑一次身體的動畫（會多飄一截＝浮在頭上沒黏住）',
   !/\.act-walk\s+\.mx-hat\s*\{\s*animation:\s*mxWalkBob/.test(cssNoC)
   && !/\.act-dance\s+\.mx-hat\s*\{\s*animation:\s*mxDance/.test(cssNoC)
   && !/\.pet-bun\.act-walk\s+\.mx-hat\s*\{/.test(cssNoC));
ok('   打電腦那一組要留著（只動 .mx-torso、沒動 .mx-svg）',
   /\.act-type \.mx-torso\s*\{ animation: mxType/.test(cssNoC)
   && /\.act-type \.mx-hat\s*\{\s*animation: mxType/.test(cssNoC));
ok('   配件本來就畫在同一個 svg 裡（翻滾轉圈都跟著走）',
   /<MxAcc id=\{acc\}[^>]*layer="back"/.test(fx) && /<MxAcc id=\{acc\}[^>]*layer="front"/.test(fx));

console.log('\n【3】⑦ 紅蘿蔔與跳躍');
ok('⭐ 紅蘿蔔是一根有形狀的紅蘿蔔（本體分段 + 亮面暗面 + 紋路 + 三叉葉子）', (() => {
   const i = fx.indexOf('className="mx-carrot"');
   const g = fx.slice(i, fx.indexOf('</g>', i));
   return (g.match(/<rect/g) || []).length >= 10; })());
ok('⭐ 每咬一口會噴碎屑', /className="mx-crumbs"/.test(fx) && /@keyframes mxCrumb\b/.test(css));
ok('   三粒碎屑各自有自己的時間（不然三粒會疊在一起飛）',
   /@keyframes mxCrumb2/.test(css) && /@keyframes mxCrumb3/.test(css));
ok('⭐ 蹬地與落地有塵土', /className="mx-dust"/.test(fx) && /@keyframes mxDust/.test(css));
ok('   塵土放在 .mx-body 裡（跟速度線同一招，會跟著 --mx-dir 翻面）',
   /mx-trail[\s\S]{0,400}mx-dust/.test(fx) && /\.mx-dust \{[^}]*position: absolute/.test(css));
ok('⭐ 跳躍不是等速（每一段有自己的加速度曲線）', (() => {
   const i = css.indexOf('@keyframes mxHop {');
   const body = css.slice(i, css.indexOf('\n}', i));
   return (body.match(/animation-timing-function/g) || []).length >= 5; })());
ok('   關掉動畫的人連碎屑與塵土都不會看到',
   /prefers-reduced-motion[\s\S]{0,400}\.pet-bun\.act-hop \.mx-crumb/.test(css));

console.log(fail ? `\n❌ ${fail} failed, ${pass} passed` : `\n🎉 全部通過：${pass} passed, 0 failed`);
process.exit(fail ? 1 : 0);
