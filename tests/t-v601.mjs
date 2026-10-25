// t-v601 — 萬聖節：老師的彈窗（.modal）不進夜色
//   🔴 Alan 截圖：一鍵出單字的「校稿」整個看不到字。
//   原因：.modal 被翻成深紫底、輸入框被翻成淺字（v563／v566），但外面的 .modal-backdrop 把顏色變數還原成亮色，
//   校稿的每張卡片（.qs-proof-row，底＝var(--bg-paper)）是亮色底 → 卡片裡的輸入框＝亮底淺字。兩套主題疊在一起。
import fs from 'fs';
const css = fs.readFileSync(new URL('../styles-holiday-hw.css', import.meta.url), 'utf8');
const code = css.replace(/\/\*[\s\S]*?\*\//g, '');
let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };
ok('⭐⭐ 夜色的浮層規則不再包含 .modal（只剩學生那邊的 sp-panel／mk-panel／growth-sheet／ca-sheet／modal-card）', !/html\.fest-hw \.modal\b(?!-)[^{]*\{/.test(code.replace(/html\.fest-hw \.modal-(backdrop|card)/g, '')) );
ok('⭐⭐ 不再有任何規則把 .modal 裡的輸入框翻成淺字（那是亮底淺字的來源）', !/\.modal:not\(\.edr-modal\)/.test(code) && !/\.modal \.edit-make-btn/.test(code));
ok('⭐ 老師彈窗的外層（.modal-backdrop）仍然把變數還原成亮色，而且 color-scheme 一起還原', /html\.fest-hw \.modal-backdrop,[\s\S]{0,300}color-scheme: light;/.test(code));
ok('⭐ 學生那邊的面板仍然是夜色', /html\.fest-hw \.sp-panel[\s\S]{0,200}background: linear-gradient\(180deg, #33224F/.test(code));
const bad = (css.match(/\*\//g) || []).length !== (css.match(/\/\*/g) || []).length;
ok('⭐ 註解開頭與結尾數量一致（之前吃過註解裡寫了結束符號、整份樣式被截斷的虧）', !bad);
console.log(fail ? `\n❌ t-v601：${pass} 過 / ${fail} 失敗` : `\n✅ t-v601：${pass} 過 / 0 失敗`);
process.exit(fail ? 1 : 0);
