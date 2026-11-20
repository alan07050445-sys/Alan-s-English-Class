// v637 存檔全面檢查：雲端沒準備好不能當成存好、草稿等雲端成功才清、沒存到的東西開機要找得回來
import fs from 'fs';
const app = fs.readFileSync(new URL('../app.jsx', import.meta.url), 'utf8');
const ed = fs.readFileSync(new URL('../components-editor.jsx', import.meta.url), 'utf8');
let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅', m); } else { fail++; console.log('  ❌', m); } };
const body = (src, start, end) => { const a = src.indexOf(start); const b = src.indexOf(end, a + 1); if (a < 0 || b < 0) throw new Error(start); return src.slice(a, b); };

console.log('\n【saveWeeksSafe】');
const sw = body(app, 'const saveWeeksSafe = (w, onOk) =>', 'const mySummerPlan');
ok('雲端沒準備好回傳 false', /!cloudReadyRef\.current[\s\S]{0,200}return false;/.test(sw));
ok('雲端寫成功才呼叫 onOk（清草稿）', /p\.then\(ok,/.test(sw) && /if \(onOk\)/.test(sw));
ok('失敗走 markSaveFail（紅條＋localStorage 備份）', /markSaveFail\(w, e\)/.test(sw));
ok('有計算「還在送的存檔」', /savePendingRef\.current\+\+/.test(sw) && /settle\(\)/.test(sw));

console.log('\n【存單元 handleSaveItem】');
const hs = body(app, 'const handleSaveItem = (form) =>', 'const handleReorderItems');
ok('⭐ 雲端沒準備好就 return，不關編輯器、不跳已存檔', /if \(!saveWeeksSafe\(w,[\s\S]{0,160}\)\) return;\s*\n\s*setWeeks\(w\);\s*\n\s*setEditorOpen\(false\);/.test(hs));
ok('⭐ 草稿等雲端成功才清（不是按存檔就清）', /edDraftClear\(savedWeekId, savedFormId\)/.test(hs) && !/edDraftClear\(weekId, form\.id\)/.test(ed));

console.log('\n【找回來】');
ok('開機比對 alan-unsaved-weeks', /localStorage\.getItem\('alan-unsaved-weeks'\)/.test(app));
ok('補回是「只加不刪」（只 concat 雲端沒有的單元）', /concat\(\[item\]\)/.test(app) && /!has\(wid, it\.id\)/.test(app));
ok('草稿也列出來（edDraftAll）', /edDraftAll\(\)/.test(app) && /function edDraftAll\(\)/.test(ed));
ok('關分頁前提醒（存檔中／失敗／編輯器開著）', /beforeunload/.test(app) && /savePendingRef\.current > 0/.test(app));
console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
