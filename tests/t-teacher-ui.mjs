/* t-teacher-ui — v442 老師端（Alan：「因為我要給其他老師用了…做清楚一點」）
 * 1) 編輯列＝三顆一鍵生成為主、其他收起來
 * 2) 一鍵出單字分級 G1G2／G3G4／G5G6，但線索一定要有
 * 3) 互動教學可以配圖，AI 會自己去免費圖庫找 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const shell  = fs.readFileSync(new URL('components-shell.jsx', ROOT), 'utf8');
const editor = fs.readFileSync(new URL('components-editor.jsx', ROOT), 'utf8');
const fc     = fs.readFileSync(new URL('components-flashcard.jsx', ROOT), 'utf8');
const data   = fs.readFileSync(new URL('data.js', ROOT), 'utf8');
const app    = fs.readFileSync(new URL('app.jsx', ROOT), 'utf8');
const slice = (src, a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i); if (i < 0 || j < 0) throw new Error('找不到 ' + a); return src.slice(i, j); };

let pass = 0, fail = 0; const log = [];
const ok = (n, c, e) => c ? (pass++, log.push('  ✅ ' + n)) : (fail++, log.push('  ❌ ' + n + (e ? '\n       ↳ ' + String(e) : '')));

log.push('\n【1】編輯列：三個一鍵生成最大、其他收在「更多」');
{
  const bar = slice(shell, 'className="edit-banner"', '</header>');
  ['一鍵出單字', '一鍵出文法', '一鍵出閱讀理解'].forEach(t => ok(`看得到「${t}」`, bar.indexOf(t) > 0));
  ok('⭐ 每一顆都寫清楚「貼什麼進去、會生出什麼」',
     /貼單字表 → 單字卡/.test(bar) && /上傳作業照片／貼文字 →/.test(bar) && /貼文章 → 背景知識/.test(bar));
  ok('⭐ 其他功能（學期／備份／封存／刪除）收在「更多」裡，預設不展開',
     /setMoreOpen\(v => !v\)/.test(bar) && /\{moreOpen && \(/.test(bar) && /React\.useState\(false\)/.test(shell));
  ok('「完成編輯」還在', /完成編輯 →/.test(bar));
  ok('刪除這一週仍然是危險色（不要誤按）', /banner-btn danger/.test(bar));
  ok('⚠ 這個檔案有兩個「{editMode && canEdit」，週次標題旁邊那一個沒被動到（v442 差點改錯地方）',
     shell.split('\n').filter(l => /^\s*\{editMode && canEdit/.test(l)).length === 2 &&
     shell.indexOf('{week.label}') < shell.indexOf('{editMode && canEdit && (') &&
     /onClick=\{onEditWeek\}/.test(shell));
}

log.push('\n【2】一鍵出單字：分級，但線索一定要有');
{
  ok('⭐ 三個級距：G1-G2／G3-G4／G5-G6', /VOCAB_BANDS = \{[\s\S]{0,900}'G1-G2'[\s\S]{0,900}'G3-G4'[\s\S]{0,900}'G5-G6'/.test(data));
  ok('低年級的句子更短更白話（8-12 字、單一子句）', /Grades 1-2[\s\S]{0,300}8-12 words/.test(data));
  ok('⭐ 不管哪一級，例句都要有線索（這是題型的重點）',
     /must ALWAYS contain a clue that makes the answer findable/.test(data) && /that rule never changes/.test(data));
  ok('年級對照：g1/g2→low、g5/g6→high、其他→mid', /vocabBandOf = \(g\) => \(g === 'g1' \|\| g === 'g2'/.test(data));
  ok('出題時真的把級距寫進 prompt', /LEVEL: \$\{band\.label\}/.test(data));
  ok('短文填空也跟著分級', /async function aiMakeVocabStory\(words, \{ hint = '', grade = 'g4'/.test(data));
  ok('⭐ 老師端選得到難度，而且預設＝現在這間教室的年級',
     /const \[grade, setGrade\]   = useS\(defaultGrade \|\| 'g4'\)/.test(editor) && /defaultGrade=\{grade\}/.test(app));
  ok('選了就會傳給 AI', /aiMakeVocabExercises\(words, \{ hint: title\.trim\(\), grade/.test(editor));
}

log.push('\n【3】互動教學配圖：AI 自己去免費圖庫找');
{
  ok('⭐ 有 autoFindImage（Pexels 優先、Pixabay 備援）', /async function autoFindImage\(keywords\)/.test(fc) && /api\.pexels\.com/.test(fc) && /pixabay\.com\/api/.test(fc));
  ok('找不到就回 null（寧可沒有圖，也不要放錯的圖）', /return null;\n\}/.test(slice(fc, 'async function autoFindImage', 'function ImageSearch')));
  ok('掛到 window 給老師端用', /ImageSearch, autoFindImage,/.test(fc));
  ok('⭐ 文法的互動教學：AI 會給情境圖關鍵字', /learn\.imgHint: 2-4 English words naming a PHOTO/.test(data));
  ok('⭐ 文法校稿頁有「AI 自動配圖」，而且只補沒有圖的那幾步',
     /autoLessonImages/.test(editor) && /if \(!st \|\| st\.kind !== 'learn' \|\| st\.img\) continue;/.test(editor));
  ok('閱讀的背景知識也有同一顆按鈕', /const autoFillImages = async/.test(editor) && /🖼️ AI 自動配圖/.test(editor));
  ok('老師自己放的圖不會被蓋掉', /st\.kind !== 'learn' \|\| st\.img\) continue/.test(editor));
}

console.log(log.join('\n'));
console.log(`\n${fail === 0 ? '🎉 全部通過' : '⚠️ 有失敗'}：${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
