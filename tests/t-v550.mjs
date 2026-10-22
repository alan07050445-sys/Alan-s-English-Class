// t-v550 — iPad Safari 登入時常跳回「之前刪掉／封存的 week 1~8」，重新整理才會好
//
// 真資料（Firestore REST 讀 class/data_g4）：
//   · weekOrder ＝ g4-2026F-W01~W20（真的課程）
//   · weeks 裡還留著 8 個舊的**種子週** g4-2026-W01~W08（空的、標籤「G4 Week 1~8」）
//     ——不在 weekOrder 裡，所以平常看不到。
// Alan 截圖的標頭是「G4 WEEK 8」＋「老師正在準備本週內容」＝就是種子週。
//
// 🔴 根因（兩層疊在一起）：
//   ① Firestore 在 iPad／iPhone Safari 上預設的串流連線會被悄悄擋掉——不報錯、
//      onSnapshot **永遠不回資料**。
//   ② 載入畫面只等「登入」不等課程資料；雲端資料沒回來時，畫面露出本機快取，
//      **沒有快取就是種子資料**（G4_DEFAULT_WEEK_ORDER ＝ 種子週）。
//   重新整理換一條新連線才會好。
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const R = (f) => fs.readFileSync(new URL(f, ROOT), 'utf8');
const noC = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const data = R('data.js'), app = R('app.jsx'), appC = noC(app), dataC = noC(data), g4 = R('data-g4.js');
let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };

console.log('\n【1】⭐ 連線層：Safari 串流被擋時要自己改用長輪詢');
ok('⭐⭐ Firestore 開啟 experimentalAutoDetectLongPolling', /_db\.settings\(\{ experimentalAutoDetectLongPolling: true, merge: true \}\)/.test(dataC));
ok('⭐⭐ 一定要在第一次使用 Firestore 之前設定（緊接在建立之後，晚了會丟錯）', (() => {
   const a = dataC.indexOf('const _db      = firebase.firestore();');
   const b = dataC.indexOf('_db.settings(');
   const first = dataC.indexOf('_db.collection(');
   return a > 0 && b > a && b < first; })());
ok('   設定失敗不可以讓整個網站起不來（包在 try 裡）', /try \{ _db\.settings\([^)]*\)[^}]*\} catch/.test(dataC));

console.log('\n【2】⭐ 載入畫面要等課程資料（沒有快取時）');
ok('⭐⭐ 沒有快取＝沒東西可以先顯示＝一定要等雲端', /const cloudNeeded = useAppMemo\(/.test(appC) && /localStorage\.getItem\(k\) == null/.test(appC));
ok('⭐⭐ cloudNeeded 在 render 時**直接算**，不放進 effect 裡 setState（effect 晚一拍，載入畫面可能已經開始淡出）',
   !/setCloudNeeded/.test(appC));
ok('⭐ 揭曉條件加上「雲端回來過／等超過 5 秒」', /&& \(!cloudNeeded \|\| cloudSeen \|\| cloudWaitedOut\)/.test(appC));
ok('⭐⭐ 永不卡死：5 秒到了就不再擋（最壞情況＝回到以前的行為）', /setTimeout\(\(\) => setCloudWaitedOut\(true\), 5000\)/.test(appC));
ok('⭐ 有快取就照舊立刻顯示（不要讓每次進站都變慢）', /const k = _CLOUD_CACHE_KEYS\[grade\];\s*if \(!k\) return false;/.test(appC));
ok('⭐ 暑假／文法有自己的載入流程，不受影響（只管 g1~g6）', /_CLOUD_CACHE_KEYS = \{ g1:/.test(appC) && !/summer:\s*'alans/.test(appC.slice(appC.indexOf('_CLOUD_CACHE_KEYS = {'), appC.indexOf('_CLOUD_CACHE_KEYS = {') + 400)));
ok('⭐⭐ 訂閱 effect 與載入畫面共用**同一份**快取 key（不要各寫一份，會走鐘）', /\.\.\._CLOUD_CACHE_KEYS, summer:/.test(appC));

console.log('\n【3】⭐ 卡住時自動重連＋講出來');
ok('⭐⭐ 4 秒沒回來：重新訂閱一次（最多兩次）——Safari 上卡住的那條連線不會自己活過來',
   /if \(cloudRetry < 2\) setCloudRetry\(n => n \+ 1\)/.test(appC) && /\[grade, user\?\.uid, cloudRetry\]/.test(appC));
ok('⭐ 重連時要先取消舊的訂閱（cleanup 呼叫 unsub），不然兩條監聽會互相蓋', /return \(\) => \{ clearTimeout\(slowT\); clearTimeout\(waitT\); try \{ unsub && unsub\(\); \}/.test(appC));
ok('⚠ 重連時不可以把等待狀態歸零（不然會一直重新開始計時、永遠不放行）', /if \(cloudRetry === 0\) \{ setCloudSeen\(false\)/.test(appC));
ok('⭐⭐ 4 秒還沒連上要在畫面上講出來，不要讓人以為這就是最新的課程', /cloudSlow && !cloudSeen/.test(appC) && /還沒連上雲端/.test(app) && /重新載入/.test(app));
ok('⭐ 資料回來就把提示收掉', /setCloudSeen\(true\); setCloudSlow\(false\);/.test(appC));

console.log('\n【3b】沒動到的安全網');
ok('⭐ 雲端還沒回來之前存檔仍然被擋（不會把種子資料蓋回雲端）', /if \(!cloudReadyRef\.current\) \{\s*alert\('資料還在從雲端載入中/.test(appC));

console.log('\n【4】⚠ 已知、刻意沒動的部分');
ok('   種子週仍是後備資料（沒有它新年級會是空的），只是不再被當成真的畫面露出來', /G4_SEED_WEEKS/.test(g4));

console.log(fail ? `\n❌ t-v550：${pass} 過 / ${fail} 失敗` : `\n✅ t-v550：${pass} 過 / 0 失敗`);
process.exit(fail ? 1 : 0);
