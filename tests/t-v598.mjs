// t-v598 — 登入後不再等暑假清單（學期中的學生用不到它）
//   以前：每個登入的學生，載入畫面要等 class/summer_meta（62KB）回來才放行；
//   有本機快取的學生，這是唯一還在等的雲端資料＝每天開網站都多等的那一段。
//   暑假清單只有兩種人需要：老師、以及開學前的暑假門口頁（summerOnlyDoor）。
import fs from 'fs';
const app = fs.readFileSync(new URL('../app.jsx', import.meta.url), 'utf8');
const code = app.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };
const eff = code.slice(code.indexOf('const summerNeeded'), code.indexOf('const isSummer = '));
ok('⭐ 誰需要暑假清單：老師，或開學前的暑假門口頁（而且要登入）', /const summerNeeded = !!user && \(window\.isAdminUser\(user\) \|\| summerOnlyDoor\);/.test(code));
ok('⭐⭐ 不需要的人：直接標記 ready（載入畫面不等）、而且不訂閱（少讀一份 62KB 文件）', /if \(!summerNeeded\) \{ setSummerMetaReady\(true\); return; \}/.test(eff) && eff.indexOf('!summerNeeded') < eff.indexOf('window.subscribeSummerMeta(\n'));
ok('⭐ 需要的人照舊：資料回來或出錯都標 ready（v322 的行為不變）', /\(m\) => \{ setSummerMeta\(m\); setSummerMetaReady\(true\); \}/.test(eff) && /\(\) => setSummerMetaReady\(true\)/.test(eff));
ok('⭐⭐ effect 的依賴有 summerNeeded（日期過了／老師身分確認後會重跑，不會卡在舊的決定）', /\}, \[user\?\.uid, summerNeeded\]\);/.test(code));
ok('⭐ 3 秒防呆還在（永不卡死）', /setTimeout\(\(\) => setSummerMetaReady\(true\), 3000\)/.test(code));
ok('⭐⭐ 學期中學生的暑假入口本來就收起來了——不然跳過讀取會讓入口讀不到資料', /\(summerOnlyDoor && hasSummerPlan\) \? \{ lib: false, mine: true/.test(code) && /summerOnly=\{summerOnlyDoor && !isTeacher && hasSummerPlan\}/.test(code));
ok('⭐ 暑假結束還停在暑假 track 的人會被拉回自己的年級（boundGrade effect）', /grade !== boundGrade/.test(code) && /applyGradeData\(boundGrade\)/.test(code));
ok('⭐ summerOnlyDoor 是 render 時算的（開學日一到自動換），不是模組載入時的常數', /const summerOnlyDoor = useAppMemo\(\(\) => new Date\(\) < TERM_START, \[nowTick\]\);/.test(code));
console.log(fail ? `\n❌ t-v598：${pass} 過 / ${fail} 失敗` : `\n✅ t-v598：${pass} 過 / 0 失敗`);
process.exit(fail ? 1 : 0);
