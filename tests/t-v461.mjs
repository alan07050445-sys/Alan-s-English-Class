/* t-v461 — Alan 2026-09-30 的八項回饋（第 8 項是提案，不在這裡測） */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const R = (f) => fs.readFileSync(new URL(f, ROOT), 'utf8');
const qm = R('components-quiz-mode.jsx'), fc = R('components-flashcard.jsx');
const ed = R('components-editor.jsx'), data = R('data.js');
const tune = R('styles-tune.css'), auth = R('styles-auth.css');

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };

console.log('\n【1】答對之後跳下一題快一點');
const plain = +(/QM_AUTO_MS_PLAIN\s*=\s*(\d+)/.exec(qm) || [])[1];
const expl  = +(/QM_AUTO_MS_EXPLAIN\s*=\s*(\d+)/.exec(qm) || [])[1];
ok(`沒解說：1000 → ${plain}（約快三成）`, plain >= 700 && plain <= 820);
ok(`有解說：4000 → ${expl}`, expl >= 2900 && expl <= 3300);
ok('全站所有題型都吃這兩個常數（改一次就全改）',
   (qm.match(/QM_AUTO_MS_(PLAIN|EXPLAIN)/g) || []).length >= 8);

console.log('\n【2】測驗模式放大圖片要跟著螢幕，不是停在第一題');
ok('⭐ 燈箱改用 createPortal 掛到 document.body', /return ReactDOM\.createPortal\(\(/.test(fc) && /\), document\.body\);/.test(fc));
ok('⚠ 有寫下原因（祖先有 transform 會綁架 position:fixed）', /qm-quiz-swap 殘留了進場動畫的 transform/.test(fc));

console.log('\n【3】iPad 滑不到最底下、按不到 submit');
ok('⭐ 高度改用 dvh（iPad 的 100vh 比看得到的高度還大）', /@supports \(height: 100dvh\)/.test(tune) && /calc\(100dvh - 161px\)/.test(tune));
ok('⭐ 作答區有上限＝不會比畫面高（拿掉「兩層捲動」）',
   /\.page-mission \.qm-quiz-area\s*\{[^}]*max-height: calc\(100dvh - 140px\)/.test(tune));
ok('側欄也收進自己的捲動區（它比畫面高時整頁才要捲）', /\.page-mission \.qm-sidebar \{ max-height: calc\(100vh - 140px\); overflow-y: auto; \}/.test(tune));
ok('⭐ 交卷鈕黏在底部，捲到哪都按得到', /\.fc-test-foot \{\s*\n\s*position: sticky; bottom: 0;/.test(tune));
ok('舊瀏覽器有後備（不支援 dvh 也至少不會兩層捲動）', /@supports not \(height: 100dvh\)/.test(tune));

console.log('\n【4】老師已經給 definition 就直接用');
ok('⭐ 老師的定義原樣送進 prompt', /\[TEACHER'S DEFINITION: "\$\{String\(w\.def\)/.test(data));
ok('⭐ 而且明講不准改寫', /copy that text into "def" EXACTLY, character for character/.test(data));
ok('要求其他欄位跟老師的定義一致（不能各說各話）', /every other field you write for that word \(sentence, explain\) must agree with it/.test(data));
ok('程式端再保一次：老師的最優先', /const def = w\.def \|\| \(a && a\.def\) \|\| w\.zh;/.test(ed));
ok('沒給定義的字還是交給 AI（不是整批跳過）', /\(w\.def \? `  \[TEACHER'S DEFINITION/.test(data));

console.log('\n【5】找出來／分一分可以出 2~3 組');
ok('⭐ 產生器收 nCircleSets / nSortSets', /nCircleSets = 1, nSortSets = 1/.test(data));
ok('每一組各自一個工作，平行送出', /const circleJobs = Array\.from/.test(data) && /const sortJobs = Array\.from/.test(data));
ok('最多 3 組（不要一次炸掉 AI）', /Math\.min\(3, \+nCircleSets \|\| 1\)/.test(data));
ok('⭐ 組間不重複：每一組給不同題材（只說「不要重複」實測會重複 4/6 個字）',
   /_GN_SET_THEMES/.test(data) && /must draw every\s*\n\s*sentence and every word from ONE subject area only/.test(data));
ok('舊的 circle / sort 仍然是「第一組」＝舊呼叫端不用改', /circle: circleSets\[0\] \|\| \[\], sort: sortSets\[0\] \|\| null/.test(data));
ok('⭐ 建立單元時一組一個（標題會編號）', /circleList\.forEach\(\(set, k\) =>/.test(ed) && /找出來\$\{nth\}/.test(ed));
ok('校稿畫面可以切換第幾組', /const SetTabs = \(\{ n, ix, set, zh \}\)/.test(ed));
ok('改第 0 組時同步回寫 res.circle（計數與提示才不會失準）', /circle: k === 0 \? arr : \(r\.circle \|\| \[\]\)/.test(ed));
ok('單元數要算進每一組', /ciSets\.filter\(x => \(x \|\| \[\]\)\.length\)\.length/.test(ed));

console.log('\n【6】文法練習題一律英文，只有「先學一下」維持中英夾雜');
ok('⭐ 有一條共用的「全英文」規則', /const GN_EN_ONLY = /.test(data) && /No Chinese characters anywhere in your output/.test(data));
ok('分一分的籃子標籤改英文', /categories: 2-4 baskets, ENGLISH labels/.test(data));
ok('分一分的指示語改英文', /instruction: ONE short ENGLISH sentence/.test(data));
ok('各題型的解說改英文', (data.match(/explain: very simple ENGLISH/g) || []).length >= 4);
ok('⭐ 先學一下（lesson）沒有被改成英文', /Explanations in spoken Traditional Chinese that KEEPS THE ENGLISH WORDS IN ENGLISH/.test(data));
ok('⭐ 中翻英的題目仍然是中文（那是題型本質）', /- zh: a natural Traditional Chinese sentence a child would say\./.test(data));
ok('學生端的指示語也改英文', /Tap every \$\{what\} in each sentence/.test(ed));

console.log('\n【7】點視窗外面不可以把打到一半的東西弄不見');
ok('⭐ 有共用的「晃一下」工具', /function useModalNudge\(\)/.test(ed));
ok('⭐ 所有長表單的背景點擊都改成晃一下，沒有一個還在關閉',
   (ed.match(/className="modal-backdrop" onClick=\{nudge\}/g) || []).length === 10
   && !/className="modal-backdrop" onClick=\{onClose\}/.test(ed));
ok('晃動動畫存在，而且尊重「減少動態」', /@keyframes modalNudge/.test(auth) && /prefers-reduced-motion[\s\S]{0,120}\.modal-nudge \{ animation: none/.test(auth));
ok('出口還在（✕ 與 取消 都沒被拿掉）', (ed.match(/className="modal-close"/g) || []).length >= 8);
ok('沒有輸入欄位的小視窗維持點背景就關（重出題目的選擇器）', /點背景關掉不會弄丟東西/.test(R('app.jsx')));

console.log(fail ? `\n❌ ${fail} failed, ${pass} passed` : `\n🎉 全部通過：${pass} passed, 0 failed`);
process.exit(fail ? 1 : 0);
