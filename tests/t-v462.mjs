/* t-v462 — Alan 挑的四個新題型：③造句 ②句型轉換 ⑦自動挑題型 ①排順序
 * ⚠ 第四項是**新題型**（sentence-order）。v414 的教訓是新題型要註冊的地方一個都不能漏
 *   （漏一個 → 做完沒星星，而且完全不會報錯）。【5】把那張清單整個檢查一遍。 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const R = (f) => fs.readFileSync(new URL(f, ROOT), 'utf8');
const data = R('data.js'), qm = R('components-quiz-mode.jsx'), ed = R('components-editor.jsx');
const mis = R('components-mistakes.jsx'), lw = R('line-notify-worker.js');

// 真的把驗證器切出來跑，不是只看字串有沒有出現
const pick = (a, b) => data.slice(data.indexOf(a), data.indexOf(b));
const V = new Function(
  'const gnNorm = (s) => String(s||"").toLowerCase().replace(/[^a-z0-9 ]/g,"").replace(/\\s+/g," ").trim();\n'
  + pick('const _gnCJK', 'async function _gnCall')
  + '\nreturn { gnValidWrite, gnValidTransform, gnValidOrder };')();

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };

console.log('\n【1】③ 造句（給情境自己寫，AI 批改）');
ok('有 prompt', /write: `You write "make a sentence" tasks/.test(data));
ok('⭐ 題目要是「情境」不是「規則」（prompt 有寫清楚好壞例子）', /BAD: "Write a sentence using a proper noun\." \(that is the rule, not a situation/.test(data));
ok('一定要說出「必須用到什麼」——那是 AI 批改的依據', /must: the grammar feature the sentence MUST contain/.test(data));
ok('驗證：太短（沒情境）不收', !V.gnValidWrite({ prompt: 'Write a sentence.', must: 'a noun' }));
ok('驗證：沒寫「必須用到什麼」不收', !V.gnValidWrite({ prompt: 'Write one sentence about what you ate yesterday at home.', must: '' }));
ok('驗證：有中文不收（v461 的全英文規則）', !V.gnValidWrite({ prompt: '寫一句關於你昨天吃了什麼的話好嗎', must: 'past tense' }));
ok('⭐ 正常的題目收得下', !!V.gnValidWrite({ prompt: 'Write one sentence about where you went last weekend.', must: 'a proper noun', hint: 'Last Sunday I went to ___.' }));
ok('沿用現成的 writing-practice 單元（星星、五星批改都現成）', /type: 'writing-practice', group: g, order: 7/.test(ed));
ok('⭐ 批改依據放進 word 欄位（checkWriting 拿它當標準）', /word: x\.must, zh: '', instruction: x\.prompt/.test(ed));

console.log('\n【2】② 句型轉換（這句是對的，換一種說法）');
ok('有 prompt', /transform: `You write "change the sentence" questions/.test(data));
ok('⭐ 明講原句必須本來就是對的（不是找錯字）', /It must already be 100% correct\s*\n\s*— this is NOT a find-the-mistake question/.test(data));
ok('⭐ 明講只能有一個答案', /If two different sentences would both be right, pick a different prompt/.test(data));
ok('驗證：前後一樣＝不是轉換', !V.gnValidTransform({ prompt: 'She is a teacher.', task: 'Make it a question.', answer: 'She is a teacher.' }));
ok('驗證：長度差太多＝模型跑掉了', !V.gnValidTransform({ prompt: 'She reads.', task: 'Make it a question.', answer: 'Does she read many interesting books about animals every single night before bed?' }));
ok('⭐ 正常的題目收得下', !!V.gnValidTransform({ prompt: 'She plays soccer on weekends.', task: 'Make it a yes/no question.', answer: 'Does she play soccer on weekends?' }));
ok('沿用 type-answer 的新 variant（寬鬆比對＋AI 判斷都現成）', /variant: 'transform'/.test(ed));
ok('學生端認得這個 variant', /const isTf = item\.variant === 'transform';/.test(qm) && /variant === 'transform' \? '🔄'/.test(qm));
ok('題幹兩行要看得出換行', /\.ta-prompt\.tf \{ white-space: pre-line/.test(R('styles-auth.css')));

console.log('\n【3】⑦ 依文法主題自動挑題型');
ok('有分類用的 prompt（五類）', /identify|form|order|usage|sentence/.test(data) && /const GN_PLAN_SYS/.test(data));
ok('⭐ 題數由程式的對照表給，不讓模型自己編數字', /const GN_PLAN_PRESET = \{/.test(data) && /不讓模型自己編數字/.test(data));
ok('⭐ 語序型的課：排順序開最大、分一分關掉', /order:\s*\{ nOrd: 8,[^}]*nSort: 0/.test(data));
ok('認出來型的課：找出來與分一分開最大、句型轉換關掉', /identify:\s*\{ nOrd: 0,[^}]*nTf: 0, nCircle: 6, nSort: 8/.test(data));
ok('⭐ AI 說「沒有可找的／可分的」就關掉那一種（它比對照表知道得多）',
   /if \(!findWhat\) preset\.nCircle = 0;/.test(data) && /if \(!sortBy\)   preset\.nSort = 0;/.test(data));
ok('判斷失敗不擋住老師（退回通用預設）', /判斷失敗不該擋住老師——退回通用的預設值/.test(data) && /guessed: !plan/.test(data));
/* 🔴 v472：這一條本來比對的是 `topic: sheet.topic`——也就是把 bug 本身鎖起來了。
   sheet 只存在於「讀作業」那個 async 函式裡，畫面上根本沒有，一打開就 ReferenceError。
   而且邏輯上也不對：這顆按鈕是在**還沒生成之前**按的，那時候 AI 還沒讀過作業。
   教訓：測試要照「應該有的行為」寫，不要照「現在的程式碼」寫，不然會把錯誤釘死。 */
/* ⚠ 只切按鈕本體：上面那段說明文字裡本來就會提到 sheet（在講以前為什麼壞），
   把註解也切進來的話，下面那條「不可以有 sheet」會自己打到自己。 */
const btnAt = ed.indexOf('className="btn ghost gn-plan-btn"');
const planBtn = ed.slice(btnAt, ed.indexOf("'判斷中…'", btnAt));
ok('老師端有按鈕，而且會把題數填好',
   /aiPlanGrammarKinds\(\{ topic: title\.trim\(\)/.test(planBtn) && /setNOrd\(pl\.nOrd\)/.test(ed));
ok('⭐ 用的是老師自己打的主題與筆記，不是還不存在的 sheet',
   !/\bsheet\b/.test(planBtn) && /notes: text\.trim\(\)/.test(planBtn));
ok('什麼都沒打的時候按鈕是灰的，而且有講為什麼',
   /disabled=\{planBusy \|\| !\(title\.trim\(\) \|\| text\.trim\(\)\)\}/.test(planBtn)
   && /我才知道這一課在教什麼/.test(ed));
ok('填好之後老師還是可以自己改（有寫在畫面上）', /下面的題數已經幫你填好了，不滿意直接改/.test(ed));

console.log('\n【4】① 排順序：出題品質');
ok('有 prompt', /order: `You write "put the words in order" questions/.test(data));
ok('⭐ 明講「只能有一種排法」，並舉出會出事的例子', /I often play basketball\." and "Often I play basketball\." are both fine/.test(data));
ok('驗證：重複的字塊不收（重複＝哪一塊放哪裡有兩種答案）', !V.gnValidOrder({ words: ['the', 'cat', 'and', 'the', 'dog', 'run'] }));
ok('驗證：一塊兩個字不收', !V.gnValidOrder({ words: ['Do you', 'like', 'pizza?', 'today'] }));
ok('驗證：太少塊不收', !V.gnValidOrder({ words: ['Do', 'you', 'run?'] }));
ok('驗證：有中文不收', !V.gnValidOrder({ words: ['Do', 'you', 'like', '披薩?'] }));
ok('⭐ 正常的題目收得下', !!V.gnValidOrder({ words: ['Does', 'he', 'play', 'basketball?'] }));
ok('打散之後不可以剛好等於正確答案（不然點一下就滿分）', /if \(a\.every\(\(v, i\) => v === i\) && n > 1\)/.test(qm));

console.log('\n【5】⭐⭐ 新題型 sentence-order 的註冊清單（v414 的教訓：漏一個就沒星星）');
const reg = [
  ['算是一件可以做的事（getQuizItems）', /item\.type === 'sentence-order'\s+&& \(item\.orderQuestions \|\| \[\]\)\.some/.test(qm)],
  ['星星對照表 AUTO_STAR_KIND', /'sentence-order': 'pct'/.test(data)],
  ['星星規則說明 AUTO_STAR_RULES', /'sentence-order': '80 分 \+10／100 分 \+15'/.test(data)],
  ['中文名 QM_TYPE_ZH', /'sentence-order': '排順序'/.test(qm)],
  ['圖示 QM_TYPE_ICON', /'sentence-order': '🧩'/.test(qm)],
  ['排序權重 qmItemRank', /'word-sort': 5, 'sentence-order': 5/.test(qm)],
  ['題數 getQuizItemTotal', /item\.type === 'sentence-order'\) return \(item\.orderQuestions \|\| \[\]\)\.length/.test(qm)],
  ['側欄歸戶的題型字 QM_TYPE_WORDS', /排順序\|句型轉換\|造句/.test(qm)],
  ['單元列的型別旗標', /const isSentOrder    = item\.type === 'sentence-order'/.test(qm)],
  ['單元列算不算有題目（hasQuiz）', /isWordSort \|\| isSentOrder \|\| isEssay/.test(qm)],
  ['單元列徽章', /isSentOrder \? `🧩 \$\{\(item\.orderQuestions\|\|\[\]\)\.length\} 句排順序`/.test(qm)],
  ['學生端掛得上畫面（intro + player）', /selectedItem\?\.type === 'sentence-order' && phase === 'quiz'/.test(qm) && /phase === 'intro'/.test(qm)],
  ['錯題本認得', /'word-sort', 'sentence-order'/.test(mis)],
  ['編輯器中文名', /'sentence-order': '排順序'/.test(ed)],
  ['編輯器題型清單', /id: "sentence-order"/.test(ed)],
  ['編輯器有編輯畫面', /form\.type === "sentence-order" \?/.test(ed)],
  ['存檔時保留 orderQuestions', /'writingPrompts', 'orderQuestions'\]/.test(ed)],
  ['LINE 作業提醒的中文名', /'sentence-order': '排順序'/.test(lw)],
  ['LINE 提醒的題型排序', /'word-sort', 'sentence-order', 'syllable-div'/.test(lw)],
  ['⭐ LINE 的 playableItem（v460：判不一樣會變成「網站看不到、LINE 一直催」）',
   /t === 'sentence-order'\)   return \(it\.orderQuestions \|\| \[\]\)\.some/.test(lw)],
];
reg.forEach(([n, c]) => ok(n, c));
ok(`⭐ 註冊清單 ${reg.filter(r => r[1]).length}/${reg.length} 全到齊`, reg.every(r => r[1]));

console.log('\n【6】產生器把四種都接上了');
['nWrite = 0', 'nTf = 0, nOrd = 0'].forEach(x => ok(`aiMakeGrammarPack 收 ${x}`, data.indexOf(x) > 0));
ok('每一種各自成敗（一種失敗不拖垮整份）', /\[W, '造句', nWrite\], \[X, '句型轉換', nTf\], \[O, '排順序', nOrd\]/.test(data));
ok('回傳 write / tf / ord', /write: W\.v \|\| \[\], tf: X\.v \|\| \[\], ord: O\.v \|\| \[\]/.test(data));
ok('校稿畫面三個新分頁', /\['ord', '🧩 排順序'/.test(ed) && /\['tf', '🔄 句型轉換'/.test(ed) && /\['write', '✍ 造句'/.test(ed));
ok('單元數要算進新的三種', /'mcq', 'fill', 'rw', 'tr', 'ord', 'tf', 'write'/.test(ed));
ok('⭐ 排順序的校稿頁有提醒老師唸一遍（最怕兩種排法都對）', /請唸一遍確認「只有這一種排法」/.test(ed));

console.log(fail ? `\n❌ ${fail} failed, ${pass} passed` : `\n🎉 全部通過：${pass} passed, 0 failed`);
process.exit(fail ? 1 : 0);
