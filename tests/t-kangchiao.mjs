/* t-kangchiao — v467：把康橋的兩種招牌題型做進一鍵出文法
 * （Alan 2026-10-06 給了 G3/G4 真實考卷；拆解見 memory/kangchiao-exam-format.md）
 *   ① 整段改錯：「There are five mistakes」「Find the 5 capitalization errors」——兩份考卷出現三次
 *   ② 先判斷錯誤類型再改正：圈 (Missing Subject / Missing Predicate) → 再改寫
 *
 * 真 AI 實測（最高級）：整段改錯 5 個錯剛好 5 個、錯在哪裡 3 題剛好 3 題、整包 6.7~19s、errors=[]
 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const data = fs.readFileSync(new URL('data.js', ROOT), 'utf8');
const ed = fs.readFileSync(new URL('components-editor.jsx', ROOT), 'utf8');

const pick = (a, b) => data.slice(data.indexOf(a), data.indexOf(b));
const V = new Function(
  'const gnNorm=(s)=>String(s||"").toLowerCase().replace(/[^a-z0-9 ]/g,"").replace(/\\s+/g," ").trim();\n'
  + pick('const _gnCJK', 'async function _gnCall')
  + '\nreturn { gnValidEditPara, gnValidDiagnose };')();

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };

const P = 'My dog Buddy is the most fastest runner here. He is the goodest boy around. His nose is black. Buddy has the most longest ears of any dog. He is a best friend to me and my whole family always.';
const good = { title: 'My Dog', paragraph: P, errors: [
  { wrong: 'most fastest', right: 'fastest', why: 'x' },
  { wrong: 'goodest', right: 'best', why: 'y' },
  { wrong: 'most longest', right: 'longest', why: 'z' } ] };

console.log('\n【1】整段改錯：程式擋得住的');
ok('⭐ 正常的收得下，而且算出 3 個錯', (V.gnValidEditPara(good, 0) || {}).errors?.length === 3);
ok('⭐ 每一句都抓出來（學生端一句一題）', (V.gnValidEditPara(good, 0) || {}).errors?.every(e => e.sentence));
ok('⭐ 照段落順序排', (() => { const e = V.gnValidEditPara(good, 0).errors; return e[0].wrong === 'most fastest' && e[2].wrong === 'most longest'; })());
ok('⭐ 錯的用詞在段落裡出現兩次 → 擋掉',
   !V.gnValidEditPara({ paragraph: 'He is the goodest boy and she is the goodest girl and they all went to the park to play together today.',
     errors: [{ wrong: 'goodest', right: 'best' }, { wrong: 'boy', right: 'child' }] }, 0));
ok('right 寫成一句解釋 → 丟掉那一筆（實測模型會把 why 塞進 right）',
   (V.gnValidEditPara({ ...good, errors: good.errors.concat([{ wrong: 'black', right: 'good is irregular; use best, not most good.' }]) }, 0) || {}).errors?.length === 3);
ok('同一個錯列兩次 → 去重', (V.gnValidEditPara({ ...good, errors: good.errors.concat([good.errors[0]]) }, 0) || {}).errors?.length === 3);
ok('改了等於沒改 → 丟掉', (V.gnValidEditPara({ ...good, errors: good.errors.concat([{ wrong: 'black', right: 'black' }]) }, 0) || {}).errors?.length === 3);
ok('有中文 → 擋掉', !V.gnValidEditPara({ ...good, paragraph: P + ' 這是中文。' }, 0));
ok('want 有指定時，數量不符就擋掉', !V.gnValidEditPara(good, 5) && !!V.gnValidEditPara(good, 3));

console.log('\n【2】⚠ 兩個實測踩到的坑（寫死規則跟考點打架）');
ok('⭐ 錯可以是「詞組」不是只能一個字——most tallest → tallest 本來就是兩個字',
   !!V.gnValidEditPara(good, 0) && /規則不能跟考點打架/.test(data));
ok('⭐ 冠詞要一起拿掉——the most good 的 the 在一句裡通常不只一個，會誤殺',
   (V.gnValidEditPara({ paragraph: 'Our family went out for dinner last Saturday evening. The food at that little restaurant was the most good thing we ate all year. My brother said he felt very happy about it. We walked home slowly under the stars and talked about going back again soon.',
     errors: [{ wrong: 'the most good', right: 'the best' }, { wrong: 'happy', right: 'happiest' }] }, 0) || {}).errors?.[0]?.wrong === 'most good');

console.log('\n【3】不能有「沒列進答案的錯」——要第二個 AI 交叉檢查');
ok('⭐ 有交叉檢查的 prompt', /const GN_EDIT_CHECK_SYS/.test(data));
ok('⭐ 兩邊的錯要完全一樣才過', /const same = seen\.length === mine\.length && mine\.every\(m => seen\.indexOf\(m\) >= 0\);/.test(data));
ok('比對時冠詞也要正規化（不然 the goodest vs goodest 會誤判）',
   /_gnNormPhrase = \(t\) =>[\s\S]{0,200}replace\(\/\^\(the\|a\|an\)/.test(data));
ok('檢查器掛掉不擋住老師', /檢查器掛掉不要擋住老師/.test(data));
ok('⭐ 不逼模型數準，多種幾個再過濾（實測種 5 個常常只剩 2~3 個能用）',
   /Plant about \$\{n \+ 2\} mistakes/.test(data) && /模型數不準/.test(data));

console.log('\n【4】先判斷錯誤類型再改正');
ok('正常的收得下', !!V.gnValidDiagnose({ broken: 'ran across the line.', kinds: ['Missing Subject', 'Missing Predicate'], answer: 0, fixed: 'My dad ran across the line.' }));
ok('沒改等於沒題目 → 擋掉', !V.gnValidDiagnose({ broken: 'He ran.', kinds: ['A', 'B'], answer: 0, fixed: 'He ran.' }));
ok('選項重複 → 擋掉', !V.gnValidDiagnose({ broken: 'ran.', kinds: ['Fragment', 'Fragment'], answer: 0, fixed: 'He ran.' }));
ok('只有一個選項 → 擋掉', !V.gnValidDiagnose({ broken: 'ran.', kinds: ['Fragment'], answer: 0, fixed: 'He ran.' }));
ok('正解索引超出範圍 → 擋掉', !V.gnValidDiagnose({ broken: 'ran.', kinds: ['A', 'B'], answer: 5, fixed: 'He ran.' }));

console.log('\n【5】⭐ 去重的 key 要認得新題型（v467 實測：3 題被砍到剩 1 題）');
ok('⭐ key 認得 broken / kinds / fixed', /x\.broken/.test(data) && /\(x\.options \|\| x\.kinds \|\| \[\]\)/.test(data));
ok('⭐ 認不出來時用整個物件當 key（最後一道保險）', /return k === '\|' \? JSON\.stringify\(x\) : k;/.test(data));
ok('有寫下教訓給下一個加題型的人', /加新題型時，它的題幹欄位一定要列進來/.test(data));

console.log('\n【6】建立成學生做得到的單元（不新增題型——v414 的教訓）');
/* v479：第二步的 variant 從 'rewrite' 改成 'word'——康橋原卷
   「Write the corrected words in the boxes」本來就只要寫改好的那幾個字，
   打整句才是「改寫句子」那一種。守的是「兩步」這件事，不是哪個 variant。 */
ok('⭐ 整段改錯 → circle-answer（圈出來）＋ type-answer（寫正確的），兩步',
   /type: 'circle-answer', group: g, order: 10/.test(ed) && /type: 'type-answer', variant: 'word', group: g, order: 11/.test(ed));
ok('⭐ 第二步只要寫改好的那幾個字（康橋原卷的寫法）', /只要寫改對的那幾個字/.test(ed));
ok('指示語寫出有幾個錯（康橋：There are five mistakes）', /There are \$\{n\} mistakes in this paragraph/.test(ed));
ok('整段文章帶進單元（學生要看得到上下文）', /passage: edit\.paragraph/.test(ed));
ok('⭐ 先判斷 → quiz，改正 → type-answer，用 requires 串成兩步',
   /requires: dxId/.test(ed) && /錯在哪裡/.test(ed));
ok('老師端有題數選擇器', /\['📝 整段改錯', nEdit, setNEdit, 8\], \['🔎 錯在哪裡', nDiag, setNDiag, 8\]/.test(ed));
ok('校稿頁有這兩個分頁', /\['edit', '📝 整段改錯'/.test(ed) && /\['diag', '🔎 錯在哪裡'/.test(ed));
ok('單元數要算成各 2 個', /res\.edit && \(res\.edit\.errors \|\| \[\]\)\.length >= 2 \? 2 : 0/.test(ed));
ok('⭐ 校稿頁提醒老師唸一遍（交叉檢查也不是百分之百）', /確認段落裡沒有「沒列進答案的錯」/.test(ed));

console.log(fail ? `\n❌ ${fail} failed, ${pass} passed` : `\n🎉 全部通過：${pass} passed, 0 failed`);
process.exit(fail ? 1 : 0);
