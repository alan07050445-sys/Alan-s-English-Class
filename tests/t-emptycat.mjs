/* t-emptycat — v505：空分類的卡片
 *
 * v464 做過「這一類這週沒安排 → 可以先複習 Week N，而且點得進去」。
 * v505 Alan 要求整組拿掉：
 *   「幫我把可以先複習這個功能刪掉，不需要，小朋友要複習自己會回去；
 *     如果我要他們複習，我會再設置作業。」
 *
 * 所以這支測試現在守的是「真的拿乾淨了」，而不是「做出來了」——
 * ⚠ 拿掉一個功能要連同它的狀態、props、CSS、以及呼叫端一起收，
 *   留一半在那裡的話，下次有人看到 onOpenWeekCat 還以為它還活著。
 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const qm = fs.readFileSync(new URL('components-quiz-mode.jsx', ROOT), 'utf8');
const app = fs.readFileSync(new URL('app.jsx', ROOT), 'utf8');
const css = fs.readFileSync(new URL('styles-home.css', ROOT), 'utf8');
const noC = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');  // 註解會打到自己

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };

console.log('\n【1】「可以先複習」整組不在了');
ok('⭐ 畫面上不再出現「可以先複習」', !/可以先複習/.test(noC(qm)));
ok('⭐ 往回找週次的 lastSeenOf 拿掉了（不是只把畫面藏起來）', !/lastSeenOf/.test(qm));
ok('⭐ canReview 這個分支不存在了', !/canReview/.test(qm));
ok('   CSS 也收掉，不要留沒人用的規則', !/\.qm-block-review/.test(css));

console.log('\n【2】呼叫端一起收');
ok('⭐ app.jsx 不再傳 onOpenWeekCat', !/onOpenWeekCat/.test(app));
ok('⭐ QuizModeBlocks 不再收 weeks / weekOrder / onOpenWeekCat 這三個只為它存在的 props',
   /function QuizModeBlocks\(\{([^}]*)\}\)/.exec(qm)[1].match(/weeks|weekOrder|onOpenWeekCat/) === null);

console.log('\n【3】空分類維持誠實且點不進去');
ok('⭐ 沒安排就寫「即將開放」，不要自作主張把學生帶走',
   /<div className="qm-block-empty">\{\/\^sl-\/\.test\(weekId\) \? '這週沒有安排這類練習' : '即將開放 · 老師正在準備本週內容'\}<\/div>/.test(qm));
ok('⭐ 只有真的有內容（或老師編輯中）才點得進去', /const clickable = total > 0 \|\| editMode;/.test(qm));
ok('   點下去就是進本週，沒有第二條路', /onClick=\{\(\) => \{ if \(clickable\) onEnterCat\(cat\); \}\}/.test(qm));
ok('   箭頭只在有內容時出現', /\) : total > 0 \? \(\s*\n\s*<div className="qm-block-arrow">/.test(qm));
ok('   暑假週（sl-）的說法沒被順手改掉', /'這週沒有安排這類練習'/.test(qm));

console.log('\n【4】被它借走的東西要留著（逾期提醒還在用）');
ok('⭐ qmTermKey 還在（v464 把它提到模組層，逾期提醒也在用）',
   /function qmTermKey\(id\) \{/.test(qm) && /const termKeyOf = qmTermKey;/.test(qm));
ok('   沒有第二份學期代碼的解析', (qm.match(/match\(\/\^\(\.\*\)-W\\d\{1,3\}\$\/i\)/g) || []).length === 1);

console.log(fail ? `\n❌ ${fail} failed, ${pass} passed` : `\n🎉 全部通過：${pass} passed, 0 failed`);
process.exit(fail ? 1 : 0);
