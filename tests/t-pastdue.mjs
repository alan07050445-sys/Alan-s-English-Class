/* t-pastdue — v463：學生進教室第一眼不該是一整牆的「你沒做完」
 *
 * 實測（G3 真實資料，一個還沒開始做的學生）：
 *   改之前：42 項預設展開、桌機佔 2.7 個畫面／iPad 直式 2.1 個，
 *           「今天的任務」被推到第 2.6～3.2 個畫面，整頁 4.1 個畫面；
 *           而且 42 列裡同一個課名原封不動重複 5 次、一個字都沒寫是哪一種題型。
 *   改之後：收起時整頁 2.2 個畫面、今天的任務在第 0.52 屏；
 *           展開時逾期區只有 0.9 個畫面（照週次收合，預設只開最近那一週）。
 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const qm = fs.readFileSync(new URL('components-quiz-mode.jsx', ROOT), 'utf8');
const css = fs.readFileSync(new URL('styles-home.css', ROOT), 'utf8');

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };

console.log('\n【a】預設收起來');
ok('⭐ pastOpen 預設 false', /const \[pastOpen, setPastOpen\] = useQM\(false\);/.test(qm));
ok('⭐ 但標題那一行永遠在（不會變成「作業不見了」——v340 當初要修的就是這個）',
   /之前還有 \{pastDue\.length\} 項作業沒完成/.test(qm) && /點一下看是哪幾項/.test(qm));
ok('有寫下量過的數字，以後不會有人手滑改回 true', /整頁 4\.1 個畫面。收起來之後整頁剩 2\.1 個/.test(qm));

console.log('\n【b】照「週次 → 一課一組 → 題型」排');
ok('⭐ 有 pastByWeek（先照週次分段）', /const pastByWeek = useQMM/.test(qm));
ok('⭐ 分組沿用 qmGroupByArticle（跟今天的任務、側欄同一套，不另寫一份）',
   /qmGroupByArticle\(wk\.rows\.map\(t => t\.it\)\)/.test(qm));
ok('⭐ 列上顯示題型：用 qmShortLabel（跟今天的任務同一個稱呼）',
   /g\.name \? qmShortLabel\(t\.it, g\.name\) : \(t\.it\.title \|\| t\.id\)/.test(qm));
ok('列上也寫分類（外師單字／文法…）', /t\.cat \? \(t\.cat\.titleZh \|\| t\.cat\.title\) : ''/.test(qm));
ok('單張卡（沒成組的）不會被硬塞一個組名', /g\.single[\s\S]{0,80}name: null/.test(qm));
ok('⭐ 週次也能收合，預設只開最近那一週',
   /const open = pastWk\[wk\.wid\] !== undefined \? pastWk\[wk\.wid\] : wi === 0;/.test(qm));
ok('週次標題是可以點的按鈕（不是純文字）', /<button className="tt-past-wkhead"/.test(qm) && /aria-expanded=\{open\}/.test(qm));
ok('每一週寫出還有幾項', /還有 \{wk\.n\} 項/.test(qm));
ok('v459 的「上次幾分」沒有被我弄丟', /上次 \{t\.lastPct\} 分，要 80 分才算完成/.test(qm));
ok('樣式有跟上（兩行列、週次段、組名、縮排）',
   /\.tt-past-wkblock/.test(css) && /\.tt-past-grpname/.test(css) && /\.tt-past-row\.in-group/.test(css) && /\.tt-past-meta/.test(css));

console.log('\n【c】新的排前面');
ok('⭐ 由近到遠跑（本來是 i=0 由最舊的開始）', /for \(let i = curIdx - 1; i >= 0; i--\)/.test(qm));
ok('有寫下為什麼（最該補的是最接近現在教的）', /最該補的是「最接近現在教的那一週」/.test(qm));

console.log('\n【不可以弄壞的既有行為】');
ok('封存的週次仍然不提醒（v400）', /if \(w\.archived\) continue;/.test(qm));
ok('不跨學期（v400）', /if \(curTerm && wTerm && wTerm !== curTerm\) continue;/.test(qm));
ok('空單元仍然不算（v460 幽靈作業）', /if \(getQuizItems\(\[hit\.it\]\)\.length === 0\) return;/.test(qm));
ok('已完成的仍然不提醒', /if \(p && p\.done\) return;/.test(qm));
ok('點了還是回到那一週去補做', /onOpenPastTask\(t\.wid, t\.cat, t\.id\)/.test(qm));

console.log(fail ? `\n❌ ${fail} failed, ${pass} passed` : `\n🎉 全部通過：${pass} passed, 0 failed`);
process.exit(fail ? 1 : 0);
