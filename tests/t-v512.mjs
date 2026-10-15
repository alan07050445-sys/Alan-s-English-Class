/* t-v512 — 🪄 上課紀錄自動擬草稿
 *
 * Alan 一週要填 20 筆上課紀錄（10 個孩子 × 2 堂），全部手打。
 * 材料其實都在系統裡：學校這週／下週的進度表、上一堂寫了什麼、上次功課做了沒。
 *
 * 🔴 這個功能最危險的不是寫得好不好，是**頁碼編出來**：
 *   「LAW p20-23」寫成「LAW p99-105」，家長照著做、小孩整份寫錯，
 *   而且畫面上看起來完全正常。所以守的重點是那個把關。
 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const data = fs.readFileSync(new URL('data.js', ROOT), 'utf8');
const dash = fs.readFileSync(new URL('components-dashboard.jsx', ROOT), 'utf8');
const stub = new Proxy(function () {}, { get: () => stub, apply: () => stub, construct: () => stub });
const W = {}; new Function('window', 'document', 'firebase', 'localStorage',
  data)(W, { documentElement: { classList: { toggle: () => {} } } }, stub, stub);

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };

const cur = {
  n: 7,
  it: { reading: 'U2W3 - Barbed Wire Baseball', law: '20-23', lawLabel: 'LAW',
        wsWb: '42-43', wsWbLabel: 'Word Study WB' },
  lt: { grammar: 'Complex Sentences', gramWb: '8-12', gramWbLabel: 'Grammar WB', grammarBold: [9, 11] },
};
const nextWk = { n: 8, it: { reading: 'U2W4', law: '24-27', lawLabel: 'LAW' },
                 lt: { grammar: 'Unseen Reading', gramWb: '13-16', gramWbLabel: 'Grammar WB' } };

console.log('\n【1】頁碼白名單');
const set = W.pacingPageSet(cur);
ok('⭐ 書本頁數整個區間都算（20-23 → 20,21,22,23）', [20, 21, 22, 23].every(n => set.has(n)));
ok('⭐ 粗體那幾頁也算（Alan：「沒粗體就是全部都教」，有粗體就只教那幾頁）', set.has(9) && set.has(11));
ok('   沒寫到的頁數不算', !set.has(99) && !set.has(50));
ok('⭐ 可以一次給好幾週（下次進度本來就會寫到下一週的頁數）', (() => {
   const two = W.pacingPageSet([cur, nextWk]);
   return two.has(23) && two.has(24) && two.has(16); })());

console.log('\n【2】⭐⭐ 編出來的頁碼一定要抓到');
ok('⭐⭐ 學校表上沒有的頁碼會被標出來', (() => {
   const bad = W.lessonDraftBadPages('LAW p99-105', cur);
   return bad.includes(99) && bad.includes(105); })());
ok('⭐ 對的頁碼不可以被誤標', W.lessonDraftBadPages('LAW p20-23、Word Study WB p.42-43', cur).length === 0);
ok('   中文的「頁」也認得', W.lessonDraftBadPages('Grammar WB 頁 99', cur).includes(99));
ok('   pp. 這種寫法也認得', W.lessonDraftBadPages('pp. 77', cur).includes(77));
ok('⚠ 沒有學校進度表時不要亂標紅（會把老師自己打的頁碼全部標成錯的）',
   W.lessonDraftBadPages('LAW p99', null).length === 0);
ok('⭐⭐ did／hw 比這一週，next 比「這一週＋下一週」——混在一起比會誤報',
   /lessonDraftBadPages\(\[out\.did, out\.hw\]\.join\('\\n'\), c\.cur\)/.test(data)
   && /lessonDraftBadPages\(out\.next, \[c\.cur, c\.nextWk\]\)/.test(data));

console.log('\n【3】提示詞裡該有的規矩');
ok('⭐⭐ 明講不准發明頁碼', /NEVER invent a page number/.test(data));
ok('⭐ 單元名稱保持英文（不要被翻成中文）', /Never translate a unit name/.test(data));
ok('⭐ 一行一件、不要項目符號與客套話', /No bullets, no numbering, no full sentences, no praise, no filler/.test(data));
ok('⭐ 上次功課沒做完要帶進下次進度', /did not finish last time's homework, carry it into/.test(data));
ok('   程式再洗一次（模型還是會加 -、1.）', /replace\(\/\^\\s\*\[-•\*\\d\.、\]\+\\s\*\/, ''\)/.test(data));

console.log('\n【4】接到畫面上');
ok('⭐ 上課紀錄表單有「🪄 幫我擬草稿」', /🪄 幫我擬草稿/.test(dash) && /const aiDraft = async \(\)/.test(dash));
ok('⭐ 只填三欄，掌握度與備註不碰（那是老師自己的判斷）',
   /setDraft\(x => \(\{ \.\.\.x, did: got\.did \|\| x\.did, hw: got\.hw \|\| x\.hw, next: got\.next \|\| x\.next \}\)\)/.test(dash)
   && !/pct: got\./.test(dash) && !/note: got\./.test(dash));
ok('⭐ 按錯了可以還原（它會蓋掉已經打好的字）', /setAiUndo\(\{ did: draft\.did/.test(dash) && /↩ 還原/.test(dash));
ok('⭐⭐ 頁碼對不上要在畫面上講出來，不可以安靜放過',
   /aiWarn && aiWarn\.length > 0/.test(dash) && /不在這一週的學校進度表上/.test(dash));
ok('   請假那一堂不用擬', /draft\.kind !== 'off' && window\.aiDraftLesson/.test(dash));
ok('   沒進度表時要講原因（不要只說失敗）', /通常是這一週還沒有學校進度表/.test(dash));
ok('   換一堂時把上一次的草稿狀態清掉', /setAiWarn\(null\); setAiUndo\(null\);/.test(dash));

console.log(fail ? `\n❌ ${fail} failed, ${pass} passed` : `\n🎉 全部通過：${pass} passed, 0 failed`);
process.exit(fail ? 1 : 0);
