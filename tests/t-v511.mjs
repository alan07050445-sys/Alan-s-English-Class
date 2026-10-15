/* t-v511 — 🎯 錯題 → 針對性練習
 *
 * Alan：「有哪些也可以使用到 AI 的地方 可以幫助學習？」→ 我排第一順位的就是這個。
 *
 * 做這個之前，網站上 13 個 AI 功能**全部都在「出題」這一端**，
 * 沒有任何一個 AI 在看「這個小孩實際做得怎麼樣」。
 *
 * 守的重點不是「有沒有做出來」，是**AI 不可以用編的**：
 *   · 診斷舉的例子必須真的在他的錯題裡（至少兩筆），否則整條丟掉
 *   · 出的題目程式驗 ＋ 第二個 AI 交叉檢查（單一正解的題型一律要有）
 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const data = fs.readFileSync(new URL('data.js', ROOT), 'utf8');
const dash = fs.readFileSync(new URL('components-dashboard.jsx', ROOT), 'utf8');
const mk   = fs.readFileSync(new URL('components-mistakes.jsx', ROOT), 'utf8');
const qm   = fs.readFileSync(new URL('components-quiz-mode.jsx', ROOT), 'utf8');
const rules= fs.readFileSync(new URL('firestore.rules', ROOT), 'utf8');
const stub = new Proxy(function () {}, { get: () => stub, apply: () => stub, construct: () => stub });
const W = {}; new Function('window', 'document', 'firebase', 'localStorage',
  data)(W, { documentElement: { classList: { toggle: () => {} } } }, stub, stub);

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };

const rows = [
  { q: 'He ___ to school.', answer: 'went', picked: 'goed', catId: 'grammar', cat: '文法', type: 'quiz' },
  { q: 'She ___ an apple.', answer: 'ate',  picked: 'eated', catId: 'grammar', cat: '文法', type: 'quiz' },
  { q: 'They ___ fast.',    answer: 'ran',  picked: 'runned', catId: 'grammar', cat: '文法', type: 'quiz' },
  { q: 'again',             answer: 'ate',  picked: 'eated', catId: 'grammar', cat: '文法', type: 'quiz' },
  { q: 'spell it',          answer: 'beach', picked: 'beech', catId: 'word', cat: '字彙學習', type: 'spelling' },
];

console.log('\n【1】先記下「他選了什麼」——這才是能診斷的原料');
ok('⭐⭐ 答錯時把他選的那一個一起記下來（本來只記正解）',
   /\[\.\.\.wrongList, \{ \.\.\.q, _picked: optIdx \}\]/.test(qm));
ok('⭐ 存進 Firestore 時帶上 picked', /o\.picked = String\(q\.options\[q\._picked\]\)/.test(data));
ok('⭐ 讀出來時也要帶（不然下游拿不到）', /picked: wq\.picked \|\| ''/.test(data));

console.log('\n【2】程式先分群（免費、即時，不用等 AI）');
const st = W.mkStats(rows);
ok('⭐ 算得出總數與各科', st.n === 5 && st.byCat.grammar === 4 && st.byCat.word === 1);
ok('⭐ 抓得出「一錯再錯」的字', st.repeats.length === 1 && st.repeats[0].answer === 'ate' && st.repeats[0].n === 2);
ok('⭐ 而且記得他寫成什麼', st.repeats[0].picked.join() === 'eated');
ok('   空資料不會炸', W.mkStats(null).n === 0 && W.mkStats([]).repeats.length === 0);

console.log('\n【3】⭐⭐ 診斷不可以用編的');
ok('⭐⭐ AI 舉的例子必須真的在他的錯題裡，否則整條丟掉',
   /if \(real\.length < 2\) return;/.test(data) && /have\.get\(String\(e \|\| ''\)\.toLowerCase\(\)\.trim\(\)\)/.test(data));
ok('⭐ 提示詞也明講「不准發明不在資料裡的字」',
   /Never invent a word that is not in the rows/.test(data));
ok('⭐ 錯題太少就不要硬掰（至少 3 題）', /if \(list\.length < 3\) return \[\];/.test(data));
ok('   診斷要帶回「是哪幾筆錯題支持這個說法」（出題時當原料）', /rows: hitRows/.test(data));

console.log('\n【4】出的題目一樣要程式驗（跟全站同一條規矩）');
ok('⭐ 四個選項、不可以重複', /new Set\(opts\.map\(o => o\.toLowerCase\(\)\)\)\.size !== 4/.test(data));
ok('⭐ 題目不可以重複', /if \(seen\.has\(key\)\) return null; seen\.add\(key\);/.test(data));
ok('⭐ 正解不可以是最長的那一個（選最長的就對＝白送分）', /if \(!rcOptionLenOk\(item\)\) return null;/.test(data));
ok('⭐⭐ 第二個 AI 交叉檢查「有沒有兩個都對」（v431/v444/v452 同一招）',
   /const bad = await _gnCheckMcq\(ok, /.test(data));
ok('⭐⭐ 正解位置由程式攤平（叫模型自己隨機化，它會謊報——v488 的教訓）',
   /options\[0\] is ALWAYS the correct one and "answer" is ALWAYS 0/.test(data) && /function _mkSpread\(/.test(data));
ok('   攤平真的把正解換到不同位置', (() => {
   const got = W.mkStats ? null : null;
   return /const to = i % 4;/.test(data); })());

console.log('\n【5】送到哪裡：個人收件匣，不要碰整個年級共用的週次');
ok('⭐⭐ 另開 practice/{email}，不寫進 class 的週次內容',
   /_db\.collection\('practice'\)\.doc\(id\)/.test(data) && /function subscribePractice/.test(data));
ok('⭐ 寫進週次會讓同年級的其他孩子也看到——理由有寫下來',
   /同年級的其他孩子也會看到/.test(data));
ok('⭐ firestore.rules：老師寫、學生只讀自己那一份', (() => {
   const seg = rules.slice(rules.indexOf('match /practice/'));
   return /allow read: if isTeacher\(\)/.test(seg)
       && /request\.auth\.token\.email\.lower\(\) == studentEmail/.test(seg)
       && /allow write: if isTeacher\(\)/.test(seg); })());

console.log('\n【6】兩端都接上去了');
ok('⭐ 老師端：學生詳情有「🎯 弱點分析」', /🎯 弱點分析/.test(dash) && /function WeakSpotModal/.test(dash));
ok('   老師要先看得到才按得下去（錯題 < 3 題時按鈕是停用的）',
   /disabled=\{stats\.n < 3 \|\| busy === 'diag'\}/.test(dash));
ok('   存不進去要講清楚是 rules 沒貼（不要只說失敗）', /firestore\.rules 還沒貼新版/.test(dash));
ok('⭐ 學生端：出現在「我的錯題」裡', /subscribePractice/.test(mk) && /mk-fix-card/.test(mk));
ok('⭐ 直接用現成的重練畫面播（不另外寫一套播放器）',
   /const startFixSet = \(set\) => \{/.test(mk) && /correct: q\.answer/.test(mk));
ok('⚠ type 要給「不在 MK_REVEAL_ONLY 裡」的值，否則會變成只顯示答案',
   /type: 'quiz'/.test(mk) && /MK_REVEAL_ONLY/.test(mk));
ok('   一題錯題都沒有、但老師有出練習時也看得到', /allWrong\.length === 0 && fixSets\.length > 0/.test(mk));

console.log(fail ? `\n❌ ${fail} failed, ${pass} passed` : `\n🎉 全部通過：${pass} passed, 0 failed`);
process.exit(fail ? 1 : 0);
