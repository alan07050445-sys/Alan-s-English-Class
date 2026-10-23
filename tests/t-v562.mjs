// v562 PDF 也能當考卷／講義來源：每頁變一張圖，之後跟照片同一條路
import fs from 'fs';
const ed = fs.readFileSync(new URL('../components-editor.jsx', import.meta.url), 'utf8');
let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅', m); } else { fail++; console.log('  ❌', m); } };
console.log('\n【PDF 轉頁】');
ok('有 PDF 轉圖的共用函式（pdf.js 用到才載，跟分段閱讀同版本）', /async function gnPdfToImages/.test(ed) && /pdf\.js\/3\.11\.174\/pdf\.min\.js/.test(ed));
ok('透明底的 PDF 先鋪白底（不然 JPEG 變黑）', /fillStyle = '#fff'; ctx\.fillRect/.test(ed));
ok('超過上限的頁數會回報，不默默丟掉', /共 \$\{r\.pages\} 頁，這次只讀了前/.test(ed));
ok('不是照片也不是 PDF 的檔案會說「已略過」', /不是照片或 PDF，已略過/.test(ed));
ok('頁面用完會 cleanup／destroy（不累積記憶體）', /page\.cleanup\(\)/.test(ed) && /pdf\.destroy\(\)/.test(ed));
console.log('\n【三個入口都收 PDF】');
ok('拍考卷：選檔器收 PDF，壞檔／密碼檔講人話', /accept="image\/\*,application\/pdf,\.pdf"/.test(ed) && /有密碼保護/.test(ed) && /PDF 可能是壞檔/.test(ed));
ok('聊天室與文法講義也收 PDF（本來寫「PDF 請先截圖」）', !/PDF 請先截圖/.test(ed) && (ed.match(/gnFilesToImages\(/g) || []).length >= 4);
ok('聊天室超過頁數會跳提示', /if \(note\) setMsgs/.test(ed));
console.log(fail ? `\n❌ t-v562：${pass} 過 / ${fail} 失敗` : `\n✅ t-v562：${pass} 過 / 0 失敗`);
process.exit(fail ? 1 : 0);
