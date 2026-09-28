/* t-flashcard-img — v439 單字卡換圖不再殘留上一張
 * Alan：「很常在下一張圖片的時候 會停在上一張單字卡的圖片一下子 可能 1 秒左右」
 * 原因：<img> 的 src 換掉之後瀏覽器會繼續畫舊圖，直到新圖解碼完成。 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const fc = fs.readFileSync(new URL('components-flashcard.jsx', ROOT), 'utf8');

let pass = 0, fail = 0; const log = [];
const ok = (n, c, e) => c ? (pass++, log.push('  ✅ ' + n)) : (fail++, log.push('  ❌ ' + n + (e ? '\n       ↳ ' + String(e) : '')));

log.push('\n【1】換卡就換一個新的 <img>（舊畫面不會留著）');
{
  const keyed = fc.match(/<img key=\{card\.imageUrl\}/g) || [];
  ok('⭐ 卡片、學習、測驗三個模式的圖片都加了 key', keyed.length === 3, keyed.length + ' 個');
  ok('三個地方都還在原本的位置（沒有改到別的圖片）',
     /className="fc-img-zoomable"/.test(fc) && /className="fc-learn-img"/.test(fc) && /className="fc-test-img fc-img-zoomable"/.test(fc));
  ok('目前這張的優先度拉高（fetchpriority）', (fc.match(/fetchpriority="high"/g) || []).length === 3);
}

log.push('\n【2】預先抓圖（換頁時通常已經在本機）');
{
  ok('⭐ 有預抓的函式，而且會往後多抓幾張', /const preloadFrom = \(i, ahead = 3\)/.test(fc) && /new Image\(\)/.test(fc));
  ok('抓過的記起來，不會每次重繪都重抓', /preloadedRef\.current\.has\(u\)/.test(fc) && /preloadedRef\.current\.add\(u\)/.test(fc));
  ok('⭐ 卡片模式：進場與換卡都會預抓', /if \(mode === 'card'\) preloadFrom\(cardIdx\)/.test(fc));
  ok('學習模式：抓「現在這張＋接下來兩張」', /if \(mode !== 'learn'\) return;[\s\S]{0,260}learnQueue \|\| \[\]\)\.slice\(0, 3\)/.test(fc));
  ok('用 decoding:async，不卡住畫面', /im\.decoding = 'async'/.test(fc));
}

log.push('\n【3】不要動到已經很敏感的東西');
{
  ok('⚠ 沒有改到 useFitHeight 的高度算法（v394/v431 的地雷）', /el\.style\.height = h \+ 'px'/.test(fc));
  ok('⚠ 圖片仍然是「可以縮的」（v393：空間不夠時讓位給例句）', /fc-back-img-wrap/.test(fc));
}


/* ── v459（Alan：「平板橫式底下還有空位，讓圖片大一點比較好」）────────────── */
{
  const fcj  = fs.readFileSync(new URL('components-flashcard.jsx', ROOT), 'utf8');
  const tune = fs.readFileSync(new URL('styles-tune.css', ROOT), 'utf8');
  console.log('\n【v459】卡片重新量測的預算＋平板橫式的留白');
  ok('⭐ 重新量測改成「滾動式預算」，不再是一輩子只有 6 次',
     /let fixes = 0, lastFixAt = 0;/.test(fcj) && /if \(now - lastFixAt > FIX_WINDOW\) fixes = 0;/.test(fcj));
  ok('防迴圈還在（連續觸發照樣會被擋下來）', /if \(fixes >= 6\) return;/.test(fcj));
  ok('⭐ 可用高度變了也要重量（上緣沒動、但下面變高變矮）',
     /const roomNow = \(\) => \{/.test(fcj) && /if \(!moved && !roomed\) return;/.test(fcj));
  ok('門檻仍是 8px（捲動不會誤觸）', /Math\.abs\(t - lastTop\) >= 8/.test(fcj) && /Math\.abs\(room - lastRoom\) >= 8/.test(fcj));
  ok('⭐ 平板橫式把卡片內距收緊（實測圖片 204→240px，+18%）',
     /@media \(min-width: 901px\) and \(max-width: 1366px\) and \(max-height: 900px\) \{[\s\S]{0,220}\.fc-p-card \.fc-face\s*\{ padding: 14px 24px; \}/.test(tune));
  ok('只動留白，中文與例句的字級一個字都沒縮',
     !/@media \(min-width: 901px\) and \(max-width: 1366px\) and \(max-height: 900px\) \{[\s\S]{0,260}font-size/.test(tune));
}

console.log(log.join('\n'));
console.log(`\n${fail === 0 ? '🎉 全部通過' : '⚠️ 有失敗'}：${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
