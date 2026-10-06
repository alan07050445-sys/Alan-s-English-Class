/* t-emptycat — v464：大廳上「這一類這週沒安排」的死卡片
 *
 * 實測 G3 Week 6：學生能做的只有 2 個單元，畫面上卻有 3 張
 * 「即將開放 · 老師正在準備本週內容」的卡片，而且**點不進去**（disabled）。
 * 改成：往回找「這一類最近一次有內容的那一週」，變成「可以先複習 Week 5」而且點得進去。
 * 實測結果：外師單字 →「可以先複習 Week 5 的 6 個練習（還有 6 個沒完成）」、
 *           閱讀理解 →「可以先複習 Week 4 的 1 個練習」、
 *           字根字首（以前就沒有內容）→ 維持「即將開放」且仍然點不進去（正確）。
 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const qm = fs.readFileSync(new URL('components-quiz-mode.jsx', ROOT), 'utf8');
const app = fs.readFileSync(new URL('app.jsx', ROOT), 'utf8');
const css = fs.readFileSync(new URL('styles-home.css', ROOT), 'utf8');

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };

console.log('\n【1】往回找「最近一次有內容的那一週」');
ok('⭐ 有 lastSeenOf', /const lastSeenOf = useQMM/.test(qm));
ok('⭐ 由近到遠找，找到就停（不要一路翻到學期初）', /for \(let i = curIdx - 1; i >= 0; i--\)[\s\S]{0,700}break;/.test(qm));
ok('⭐ 封存的週次不算（v400 ①）', /if \(!w \|\| w\.archived\) continue;/.test(qm));
ok('⭐ 不跨學期（v400 ②）', /if \(curTerm && wTerm && wTerm !== curTerm\) continue;/.test(qm));
ok('⭐ 空單元不算（v460 幽靈作業：不能指到一個點進去是空的週次）',
   /const items = getQuizItems\(\(w\.items \|\| \{\}\)\[cat\.id\] \|\| \[\]\);\s*\n\s*if \(!items\.length\) continue;/.test(qm));
ok('順便算出「還有幾個沒完成」（比只寫幾個練習更有動力）', /const left = items\.filter\(it => \{ const p = qmProg\[`\$\{wid\}_\$\{it\.id\}`\]; return !\(p && p\.done\); \}\)\.length;/.test(qm));

console.log('\n【2】卡片變成點得進去');
ok('⭐ canReview 時 clickable', /const clickable = total > 0 \|\| editMode \|\| canReview;/.test(qm));
ok('⭐ 點了去那一週的那一類', /onOpenWeekCat\(lastSeen\.wid, cat\);/.test(qm));
ok('本週有內容時行為不變（還是進本週）', /if \(total > 0 \|\| editMode\) return onEnterCat\(cat\);/.test(qm));
ok('箭頭也要跟著出現', /\(total > 0 \|\| canReview\) \? \(\s*\n\s*<div className="qm-block-arrow">/.test(qm));
ok('⭐ 沒有巢狀按鈕（整張卡本身就是按鈕，不能再塞一顆進去）',
   !/qm-block-review[\s\S]{0,200}<button/.test(qm));

console.log('\n【3】文案');
ok('寫「這週還沒有安排」而不是「即將開放」', /<div className="qm-block-empty">這週還沒有安排<\/div>/.test(qm));
ok('寫出是哪一週、幾個練習', /可以先複習 <b>\{lastSeen\.label\}<\/b> 的 \{lastSeen\.n\} 個練習/.test(qm));
ok('還有幾個沒完成（有才寫）', /\{lastSeen\.left > 0 && <span>（還有 \{lastSeen\.left\} 個沒完成）<\/span>\}/.test(qm));
ok('⭐ 真的完全沒有過內容時，維持原本的「即將開放」且點不進去',
   /\) : \(\s*\n\s*<div className="qm-block-empty">\{\/\^sl-\/\.test\(weekId\) \? '這週沒有安排這類練習' : '即將開放 · 老師正在準備本週內容'\}<\/div>/.test(qm));
ok('暑假週（sl-）的說法沒被改掉', /'這週沒有安排這類練習'/.test(qm));
ok('樣式有跟上', /\.qm-block-review/.test(css));

console.log('\n【4】導覽：去複習之後要回得來');
ok('⭐ app.jsx 有接 onOpenWeekCat', /onOpenWeekCat=\{\(wid, cat\) => \{/.test(app));
ok('⭐ 記住原本在哪一週（不然會被留在舊週次——v341 修過的坑）',
   /returnWeekRef\.current = weekIdx; setWeekIdx\(idx\);/.test(app) &&
   /onOpenWeekCat[\s\S]{0,300}returnWeekRef\.current = weekIdx/.test(app));
ok('weeks / weekOrder 有傳下去', /weeks=\{weeks\}\s*\n\s*weekOrder=\{viewOrder\}/.test(app));

console.log('\n【5】同一個判斷只留一份');
ok('⭐ termKeyOf 提到模組層成為 qmTermKey（逾期提醒與空分類共用）',
   /function qmTermKey\(id\) \{/.test(qm) && /const termKeyOf = qmTermKey;/.test(qm));
ok('沒有第二份學期代碼的解析', (qm.match(/match\(\/\^\(\.\*\)-W\\d\{1,3\}\$\/i\)/g) || []).length === 1);

console.log(fail ? `\n❌ ${fail} failed, ${pass} passed` : `\n🎉 全部通過：${pass} passed, 0 failed`);
process.exit(fail ? 1 : 0);
