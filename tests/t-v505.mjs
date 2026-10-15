/* t-v505 — 側欄分組預設收起 + 老師上課紀錄的字級
 *
 * Alan（⑧）：「每次點開每個 item 都是被點開的狀態，不要這樣，預設縮起來，
 *   不然如果今天有很多題目那不就太滿了？之前被打開一旦跳出去一樣回到縮回去狀態。」
 *
 * 真正的原因不是「預設值寫錯」——openGroups 一開始就是 {}。
 * 是它**只進不出**：從作業點進某一課會自動展開那一組，退回清單沒有人關掉，
 * 再點下一課又展開一組，一個下午做下來就全開了。
 *
 * Alan（①）：「畫面很漂亮但字體太小，幫我加大。」
 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const qm  = fs.readFileSync(new URL('components-quiz-mode.jsx', ROOT), 'utf8');
const css = fs.readFileSync(new URL('styles-tune.css', ROOT), 'utf8');

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };
const num = (re) => { const m = re.exec(css); return m ? parseFloat(m[1]) : NaN; };

console.log('\n【1】同一時間只有一組是開的');
ok('⭐ 展開一組＝關掉其他組（不是往物件裡疊加）',
   /setOpenGroups\(o => \(o\[g\.key\] \? \{\} : \{ \[g\.key\]: true \}\)\)/.test(qm));
ok('⭐ 自動展開「選中單元那一組」時也要取代，不要疊加',
   /setOpenGroups\(\{ \[g\.key\]: true \}\)/.test(qm)
   && !/setOpenGroups\(o => \(\{ \.\.\.o,/.test(qm));
ok('⭐ 換分類／換週次就全部收回去（＝他說的「跳出去就回到縮回去狀態」）',
   /useQME\(\(\) => \{ setOpenGroups\(\{\}\); \}, \[cat && cat\.id, weekId\]\);/.test(qm));
ok('   自動展開選中單元那一組要留著，不然從作業點進來看不到自己在哪',
   /grouped\.find\(x => x\.items && x\.items\.some\(it => it\.id === selectedItem\.id\)\)/.test(qm));
ok('   初始值是「全部收起來」', /const \[openGroups, setOpenGroups\] = useQM\(\{\}\);/.test(qm));

/* 🔴 v510（Alan 第三次回報「側邊欄還是沒改」）：前兩次都沒找到真正的原因。
   不是預設值寫錯（openGroups 一開始就是 {}），是**桌機一進分類就自動選第一個單元**，
   而「選中就展開它所在的組」緊接著把那一組打開——所以永遠是展開的。
   同一個坑 v261 在題庫視角踩過，那行註解就寫著「自動選會連帶展開它的分組」，
   我前兩次都沒讀到那裡。 */
ok('⭐⭐ 自動選第一個單元時要做記號（autoPickRef）',
   /const autoPickRef = React\.useRef\(false\);/.test(qm)
   && /autoPickRef\.current = true;\s*\n\s*selectItem\(firstMain \|\| sidebarItems\[0\]\);/.test(qm));
ok('⭐⭐ 自動選的那一次不展開分組（否則「預設收起來」永遠看不到效果）',
   /if \(autoPickRef\.current\) \{ autoPickRef\.current = false; return; \}/.test(qm));
ok('⭐ 從「今天的任務」點進來仍然要展開（不然看不到自己在哪）', (() => {
   // wanted 那條路在設記號之前就 return 了，所以 flag 還是 false
   const i = qm.indexOf('const wanted = initialItemId');
   const j = qm.indexOf('autoPickRef.current = true;', i);
   const k = qm.indexOf('if (wanted) { selectItem(wanted); return; }', i);
   return k > i && j > k; })());

console.log('\n【1b】v509：真正每天會看到的那一張——「今天的任務」');
/* ⚠ v505 我修錯地方了：Alan 給的圖是側欄，我只改了側欄的 qm-ugroup，
   但他每天看到的是 TodayTasks 的 tt-group，兩套各自有自己的收合狀態。
   這一段守「兩套都預設收起來」，免得下次又只修一半。 */
ok('⭐⭐ 任務清單的分組一律預設收起來（本來是「沒全做完就展開」＝幾乎永遠展開）',
   /const open  = !!ttOpen\[gKey\];/.test(qm) && !/ttOpen\[gKey\] !== undefined/.test(qm));
ok('⭐ 換週次就全部收回去', /useQME\(\(\) => \{ setTtOpen\(\{\}\); \}, \[weekId\]\);/.test(qm));
ok('   收起來時標題列還是寫得出進度（不然會以為作業不見了）',
   /tt-group-count">\{gDone\} \/ \{e\.tasks\.length\}/.test(qm));
ok('   點一下照樣打開', /setTtOpen\(o => \(\{ \.\.\.o, \[gKey\]: !open \}\)\)/.test(qm));

console.log('\n【2】上課紀錄的字級（Alan：「字體太小」）');
ok('⭐ 內容字比 v504 的 14px 大', num(/\.tlog-f p \{[^}]*font-size: ([\d.]+)px/) >= 16);
ok('⭐ 欄位標籤比 v504 的 10.5px 大', num(/\.tlog-f em \{[^}]*font-size: ([\d.]+)px/) >= 12.5);
ok('⭐ 日期比 v504 的 19px 大', num(/\.tlog-date b \{[^}]*font-size: ([\d.]+)px/) >= 21);
ok('   卡片標題也跟著大', num(/\.tlog-ttl b \{[^}]*font-size: ([\d.]+)px/) >= 22);
ok('   標籤藥丸跟著大，不然會變成大字配小籤', num(/\.tlog-p, \.tlog-rv \{[^}]*font-size: ([\d.]+)px/) >= 12);
ok('   手機版有自己的一份（字放大後最怕擠爆窄螢幕）', /@media \(max-width: 560px\)[\s\S]{0,260}\.tlog-f p \{ font-size/.test(css));

console.log(fail ? `\n❌ ${fail} failed, ${pass} passed` : `\n🎉 全部通過：${pass} passed, 0 failed`);
process.exit(fail ? 1 : 0);
