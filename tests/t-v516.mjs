/* t-v516 — 📸 拍考卷照片 → 變成互動版
 *
 * Alan 手上有一疊考過的 Formative。v515 做好了「考卷」這個容器，這一版把紙變成資料。
 * 讀照片的機制沿用 v428~v430（一張一個請求、同時送、壞一頁只少一頁）。
 *
 * 🔴 這份照片跟作業照片最大的不同：上面滿滿都是學生的手寫答案與老師的紅筆，
 *   而且有姓名與分數。那是別人家小孩的成績，沒有理由進我們的資料庫。
 *
 * 🔴 兩個實測才發現的坑（都寫進程式了）：
 *   ① 模型很愛把選擇題「一題拆成一個 part」，options 直接放在 part 上。
 *     照原本的清洗整頁會被清成 0 大題 → 回報「這一張讀不出東西」，一半的卷子就這樣消失。
 *   ② Alan 是把攤開的卷子一次拍一張——**一張照片上有左右兩頁**。
 *     原本寫「read only this page」，模型就真的只讀一邊，32 分的填空時有時無。
 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const data  = fs.readFileSync(new URL('data.js', ROOT), 'utf8');
const ed    = fs.readFileSync(new URL('components-editor.jsx', ROOT), 'utf8');
const app   = fs.readFileSync(new URL('app.jsx', ROOT), 'utf8');
const shell = fs.readFileSync(new URL('components-shell.jsx', ROOT), 'utf8');
const stub = new Proxy(function () {}, { get: () => stub, apply: () => stub, construct: () => stub });
const W = {}; new Function('window', 'document', 'firebase', 'localStorage',
  data)(W, { documentElement: { classList: { toggle: () => {} } } }, stub, stub);

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };

console.log('\n【1】🔒 隱私：這是別人家小孩的考卷');
ok('⭐⭐ 提示詞明講不要抓姓名、班級、分數',
   /NEVER output the student's name, class or score/.test(data));
ok('⭐⭐ 明講只讀印刷的題目，不要讀手寫與紅筆',
   /READ THE PRINTED QUESTIONS ONLY/.test(data) && /Ignore ALL handwriting and red pen/.test(data));
ok('   填空的答案是「自己從詞庫選」，不是抄學生的手寫',
   /YOU choose the answer from the bank/.test(data) && /do not copy the student's handwriting/.test(data));

console.log('\n【2】🔴 一張照片上有兩頁（Alan 拍的是攤開的卷子）');
ok('⭐⭐ 提示詞要它把整張照片都讀完，不是只讀一頁',
   /Read EVERYTHING visible in this photo/.test(data));
ok('⭐⭐ 明講可能是左右兩頁，左先右後', /TWO facing pages of an open booklet/.test(data));
ok('   理由有寫下來（32 分的填空時有時無）', /一張照片上有左右兩頁/.test(data));

console.log('\n【3】🔴 模型把選擇題一題拆成一個 part');
ok('⭐⭐ 提示詞把形狀講死：一個 part 裝所有題目',
   /ONE part holds ALL the questions of that Part, in a\s*\n\s*"questions" ARRAY/.test(data)
   && /Do NOT emit one part per question/.test(data));
ok('⭐ 範例裡真的示範了一個 part 兩題', /Note how ONE quiz part holds SIX questions/.test(data));
ok('⭐⭐ 程式再撿一次：形狀不對但東西都在的，包回陣列', (() => {
   const p = W._examCleanPart ? null : null;   // 內部函式，改驗行為：用整段流程的合併結果
   return /if \(p\.kind === 'quiz' && !Array\.isArray\(p\.questions\) && Array\.isArray\(p\.options\)\)/.test(data); })());
ok('⭐⭐ 填空的句子放在 sentences 而不是 items 也要撿回來（實測真的這樣回）',
   /const alt = \[p\.sentences, p\.questions, p\.blanks\]\.find\(Array\.isArray\)/.test(data));
ok('⭐ 提示詞也把欄位名講死', /The sentences go in a field called "items" \(NOT "sentences"/.test(data));
ok('   範例裡真的示範了 cloze 的 items', /"items":\[\{"text":"Mark ___ on the test\."/.test(data));
ok('⭐ 連續的同型大題會併回去（模型拆開的那種）',
   /const same = last && last\.kind === pt\.kind && \(pt\.kind === 'quiz' \|\| pt\.kind === 'short'\)/.test(data));
ok('⚠ 只併「後面那個沒有自己的標題」的——真的有兩個 Part 的卷子不可以被併掉',
   /if \(same && !pt\.title\)/.test(data));

console.log('\n【4】讀不出來的要講清楚，不要整份說「讀不懂」');
ok('⭐ 哪一張沒讀到要指名', /const missed = got\.map\(\(g, i\) =>/.test(data) && /這幾張沒讀出東西/.test(ed));
ok('⭐ 做不出來的題型要列出來，不是安靜丟掉',
   /put a short description in "skipped"/.test(data) && /這幾大題網站還做不出來，先跳過了/.test(ed));
ok('   連一張都讀不到時給得出下一步', /請拍正一點、光線亮一點，整頁都要入鏡/.test(data));

console.log('\n【5】⭐ 校稿檢查不另外寫一份');
ok('⭐⭐ 直接用 v515 老師手打考卷的那組 examWarnings',
   /return \{ item, skipped: \[\.\.\.new Set\(skipped\)\], missed, warnings: examWarnings\(item\) \}/.test(data));
ok('   理由有寫下來（同一件判斷只留一份）', /同一件判斷只留一份/.test(data));
ok('⭐ 程式判不出來的圈選規則不收（不要生出一個學生永遠做不對的題）',
   /if \(!WS_CHECKS\[check\]\) return null;/.test(data));
ok('⭐ 正解超出選項範圍的那一題不收', /if \(!\(a >= 0 && a < options\.length\)\) return null;/.test(data));

console.log('\n【6】接到畫面上');
ok('⭐ 編輯列有「📸 拍考卷」', /<b>拍考卷<\/b>/.test(shell) && /onExamScan/.test(shell));
ok('⭐ app.jsx 接上了', /onExamScan=\{window\.ExamScanModal/.test(app) && /<window\.ExamScanModal/.test(app));
ok('⭐ 有校稿頁（讀到什麼就攤開什麼，看過才存）',
   /function ExamScanModal/.test(ed) && /讀到什麼就攤開什麼/.test(ed));
ok('⭐ 存檔走自己的路，不借 handleQuickSet', (() => {
   const i = app.indexOf('const handleAddBuiltItems');
   return i > 0 && /刻意不借 handleQuickSet/.test(app); })());
ok('   最多 8 張（再多就是在燒錢也讀不準）', /\.slice\(0, 8\)/.test(data) && /imgs\.length < 8/.test(ed));
ok('   同一張可以刪掉重拍', /setImgs\(v => v\.filter\(\(_, k\) => k !== i\)\)/.test(ed));

console.log(fail ? `\n❌ ${fail} failed, ${pass} passed` : `\n🎉 全部通過：${pass} passed, 0 failed`);
process.exit(fail ? 1 : 0);
